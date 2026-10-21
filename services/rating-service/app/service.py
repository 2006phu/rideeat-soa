"""Application Service for Rating & Review Management with Redis Caching."""

from typing import Any, Dict, List, Optional

from services.common.cache.redis_client import ICacheProvider
from services.common.domain.base_service import BaseApplicationService
from services.common.exceptions import BusinessRuleViolationException
from services.common.messaging.interfaces import IEventPublisher
from app.models import Review
from app.repositories import ReviewRepository
from app.schemas import CreateReviewRequest, RatingSummaryResponse


class RatingApplicationService(BaseApplicationService[ReviewRepository]):
    """Encapsulates review submission, validation, Redis cache read/invalidation, and event publishing."""

    CACHE_TTL_SECONDS = 300

    def __init__(
        self,
        repository: ReviewRepository,
        cache_provider: Optional[ICacheProvider] = None,
        event_publisher: Optional[IEventPublisher] = None,
    ) -> None:
        super().__init__(repository=repository, event_publisher=event_publisher)
        self._cache = cache_provider

    @staticmethod
    def _summary_cache_key(target_type: str, target_id: str) -> str:
        return f"rating:summary:{target_type.lower()}:{target_id}"

    async def create_review(self, payload: CreateReviewRequest) -> Review:
        """Validate and persist a new review, invalidate target's rating summary cache, and emit event."""
        normalized_type = payload.target_type.lower().strip()
        review = Review(
            reviewer_id=payload.reviewer_id,
            target_id=payload.target_id,
            target_type=normalized_type,
            reference_id=payload.reference_id,
            stars=payload.stars,
            comment=payload.comment,
            image_url=payload.image_url,
        )
        review.validate_rating()

        existing = await self.repository.find_duplicate(
            reviewer_id=payload.reviewer_id,
            target_type=normalized_type,
            target_id=payload.target_id,
            reference_id=payload.reference_id,
        )
        if existing is not None:
            raise BusinessRuleViolationException(
                f"Review already submitted for {normalized_type} '{payload.target_id}' on reference '{payload.reference_id}'.",
                details={"review_id": existing.id},
            )

        review = await self.repository.save(review)

        # Invalidate Redis summary cache on new review
        if self._cache is not None:
            cache_key = self._summary_cache_key(normalized_type, payload.target_id)
            await self._cache.delete(cache_key)

        summary = await self.get_target_rating_summary(normalized_type, payload.target_id)

        await self.publish_domain_event(
            topic="rating.created",
            payload={
                "review_id": review.id,
                "reviewer_id": review.reviewer_id,
                "target_id": review.target_id,
                "target_type": review.target_type,
                "reference_id": review.reference_id,
                "stars": review.stars,
                "average_stars": summary.average_stars,
                "total_reviews": summary.total_reviews,
            },
            source_service="rating-service",
        )
        return review

    async def list_target_reviews(
        self, target_type: str, target_id: str, skip: int = 0, limit: int = 50
    ) -> List[Review]:
        """List reviews for a specific driver or restaurant."""
        return await self.repository.list_by_target(
            target_type=target_type.lower(),
            target_id=target_id,
            skip=skip,
            limit=limit,
        )

    async def get_target_rating_summary(
        self, target_type: str, target_id: str
    ) -> RatingSummaryResponse:
        """Retrieve average rating summary for a target, served from Redis cache when available."""
        normalized_type = target_type.lower().strip()
        cache_key = self._summary_cache_key(normalized_type, target_id)

        if self._cache is not None:
            cached_data: Optional[Dict[str, Any]] = await self._cache.get_json(cache_key)
            if cached_data is not None:
                return RatingSummaryResponse(**cached_data, cached=True)

        stats = await self.repository.compute_target_stats(normalized_type, target_id)
        if self._cache is not None:
            await self._cache.set_json(cache_key, stats, ttl_seconds=self.CACHE_TTL_SECONDS)

        return RatingSummaryResponse(**stats, cached=False)
