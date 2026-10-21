"""FastAPI REST Routes for Rating & Review Service."""

from typing import List
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories import ReviewRepository
from app.schemas import CreateReviewRequest, RatingSummaryResponse, ReviewResponse
from app.service import RatingApplicationService

router = APIRouter(prefix="/api/ratings", tags=["Ratings & Reviews"])


async def get_db_session(request: Request):
    db_manager = request.app.state.db_manager
    async for session in db_manager.get_session():
        yield session


def get_rating_service(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> RatingApplicationService:
    repo = ReviewRepository(session)
    redis_manager = getattr(request.app.state, "redis_manager", None)
    kafka_bus = getattr(request.app.state, "kafka_bus", None)
    return RatingApplicationService(
        repository=repo,
        cache_provider=redis_manager,
        event_publisher=kafka_bus,
    )


@router.post("", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    payload: CreateReviewRequest,
    service: RatingApplicationService = Depends(get_rating_service),
) -> ReviewResponse:
    """Submit a 1..5 star review for a driver or restaurant."""
    review = await service.create_review(payload)
    return ReviewResponse.model_validate(review)


@router.get("/target/{target_type}/{target_id}", response_model=List[ReviewResponse])
async def list_target_reviews(
    target_type: str,
    target_id: str,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    service: RatingApplicationService = Depends(get_rating_service),
) -> List[ReviewResponse]:
    """List reviews for a driver or restaurant."""
    reviews = await service.list_target_reviews(
        target_type=target_type, target_id=target_id, skip=skip, limit=limit
    )
    return [ReviewResponse.model_validate(r) for r in reviews]


@router.get("/summary/{target_type}/{target_id}", response_model=RatingSummaryResponse)
async def get_target_rating_summary(
    target_type: str,
    target_id: str,
    service: RatingApplicationService = Depends(get_rating_service),
) -> RatingSummaryResponse:
    """Get cached average rating and 1..5 star breakdown for a driver or restaurant."""
    return await service.get_target_rating_summary(
        target_type=target_type, target_id=target_id
    )
