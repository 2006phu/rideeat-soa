"""Repository for Review Persistence & Aggregate Rating Queries (Repository Pattern)."""

from typing import Any, Dict, List, Optional
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from services.common.domain.base_repository import SqlAlchemyRepository
from app.models import Review


class ReviewRepository(SqlAlchemyRepository[Review]):
    """Concrete repository managing Review entities and star breakdown aggregations."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Review)

    async def list_by_target(
        self, target_type: str, target_id: str, skip: int = 0, limit: int = 50
    ) -> List[Review]:
        stmt = (
            select(Review)
            .where(
                Review.target_type == target_type.lower(),
                Review.target_id == target_id,
            )
            .order_by(desc(Review.created_at))
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def find_duplicate(
        self, reviewer_id: str, target_type: str, target_id: str, reference_id: str
    ) -> Optional[Review]:
        stmt = select(Review).where(
            Review.reviewer_id == reviewer_id,
            Review.target_type == target_type.lower(),
            Review.target_id == target_id,
            Review.reference_id == reference_id,
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def compute_target_stats(self, target_type: str, target_id: str) -> Dict[str, Any]:
        """Aggregate average stars, total count, and 1..5 star distribution from database."""
        normalized_type = target_type.lower()
        stmt = (
            select(Review.stars, func.count(Review.id))
            .where(
                Review.target_type == normalized_type,
                Review.target_id == target_id,
            )
            .group_by(Review.stars)
        )
        result = await self._session.execute(stmt)
        rows = result.all()

        breakdown: Dict[str, int] = {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
        total_reviews = 0
        weighted_sum = 0
        for star_val, count in rows:
            cnt = int(count)
            star_key = str(star_val)
            if star_key in breakdown:
                breakdown[star_key] = cnt
            total_reviews += cnt
            weighted_sum += int(star_val) * cnt

        avg_rating = round(weighted_sum / total_reviews, 2) if total_reviews > 0 else 5.0
        return {
            "target_type": normalized_type,
            "target_id": target_id,
            "average_stars": avg_rating,
            "total_reviews": total_reviews,
            "star_breakdown": breakdown,
        }
