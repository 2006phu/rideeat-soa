"""Universal API Gateway & Service Response Envelope Contracts.

Provides strongly typed envelopes ensuring uniform JSON structure across all endpoints.
"""

from datetime import datetime, timezone
from typing import Any, Dict, Generic, List, Optional, TypeVar
from pydantic import BaseModel, Field

DataT = TypeVar("DataT")


class ApiPaginationMeta(BaseModel):
    """Pagination metadata included in paginated collection responses."""
    page: int = Field(default=1, ge=1, description="Current page number (1-based)")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page")
    total_items: int = Field(default=0, ge=0, description="Total record count")
    total_pages: int = Field(default=1, ge=1, description="Calculated total pages")


class ApiErrorEnvelope(BaseModel):
    """Standardized error details compliant with RFC 7807 (Problem Details)."""
    error_code: str = Field(..., description="Machine-readable snake_case or SCREAMING_SNAKE error code")
    message: str = Field(..., description="Human-readable error explanation in Vietnamese or English")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    details: Optional[Dict[str, Any]] = Field(default=None, description="Optional diagnostic or field-level validation errors")


class ApiResponse(BaseModel, Generic[DataT]):
    """Standardized response envelope wrapping all SOA HTTP payloads."""
    success: bool = Field(default=True, description="Indicates whether the requested operation succeeded")
    data: Optional[DataT] = Field(default=None, description="Typed business payload (null if operation failed)")
    message: Optional[str] = Field(default=None, description="Informational message or flash alert")
    meta: Optional[Dict[str, Any]] = Field(default=None, description="Optional metadata such as pagination or latency")
    error: Optional[ApiErrorEnvelope] = Field(default=None, description="Populated when success is False")

    @classmethod
    def ok(cls, data: DataT, message: Optional[str] = None, meta: Optional[Dict[str, Any]] = None) -> "ApiResponse[DataT]":
        """Factory method for successful responses."""
        return cls(success=True, data=data, message=message, meta=meta, error=None)

    @classmethod
    def fail(cls, error_code: str, message: str, details: Optional[Dict[str, Any]] = None) -> "ApiResponse[Any]":
        """Factory method for error responses."""
        return cls(
            success=False,
            data=None,
            error=ApiErrorEnvelope(error_code=error_code, message=message, details=details),
        )
