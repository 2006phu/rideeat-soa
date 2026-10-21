"""OOP Domain Exception Hierarchy and FastAPI Exception Handlers."""

from typing import Any, Dict, Optional
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse


class DomainException(Exception):
    """Base class for all domain and business logic exceptions (Inheritance root)."""

    def __init__(
        self,
        message: str,
        error_code: str = "DOMAIN_ERROR",
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(message)
        self._message = message
        self._error_code = error_code
        self._status_code = status_code
        self._details = details or {}

    @property
    def message(self) -> str:
        return self._message

    @property
    def error_code(self) -> str:
        return self._error_code

    @property
    def status_code(self) -> int:
        return self._status_code

    @property
    def details(self) -> Dict[str, Any]:
        return self._details

    def to_dict(self) -> Dict[str, Any]:
        return {
            "error": self._error_code,
            "message": self._message,
            "details": self._details,
        }


class EntityNotFoundException(DomainException):
    """Raised when a requested domain entity does not exist."""

    def __init__(self, entity_name: str, entity_id: Any) -> None:
        super().__init__(
            message=f"{entity_name} with ID '{entity_id}' was not found.",
            error_code="ENTITY_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details={"entity": entity_name, "id": str(entity_id)},
        )


class InvalidStateTransitionException(DomainException):
    """Raised when an entity attempts an invalid lifecycle state transition."""

    def __init__(self, entity_name: str, current_state: str, target_state: str) -> None:
        super().__init__(
            message=f"Cannot transition {entity_name} from '{current_state}' to '{target_state}'.",
            error_code="INVALID_STATE_TRANSITION",
            status_code=status.HTTP_409_CONFLICT,
            details={
                "entity": entity_name,
                "current_state": current_state,
                "target_state": target_state,
            },
        )


class BusinessRuleViolationException(DomainException):
    """Raised when a domain invariant or business rule is violated."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(
            message=message,
            error_code="BUSINESS_RULE_VIOLATION",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )


class InsufficientBalanceException(BusinessRuleViolationException):
    """Raised when wallet balance is insufficient for a debit operation."""

    def __init__(self, current_balance: float, required_amount: float) -> None:
        super().__init__(
            message=f"Insufficient wallet balance: available {current_balance:,.0f} VND, required {required_amount:,.0f} VND.",
            details={"current_balance": current_balance, "required_amount": required_amount},
        )


class UnauthorizedAccessException(DomainException):
    """Raised when authentication fails or token is invalid."""

    def __init__(self, message: str = "Authentication required or invalid token.") -> None:
        super().__init__(
            message=message,
            error_code="UNAUTHORIZED",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class ForbiddenAccessException(DomainException):
    """Raised when a user lacks required role/permissions."""

    def __init__(self, message: str = "Insufficient permissions to perform this action.") -> None:
        super().__init__(
            message=message,
            error_code="FORBIDDEN",
            status_code=status.HTTP_403_FORBIDDEN,
        )


class ExternalServiceException(DomainException):
    """Raised when an inter-service call or third-party provider fails."""

    def __init__(self, service_name: str, reason: str) -> None:
        super().__init__(
            message=f"External service '{service_name}' error: {reason}",
            error_code="EXTERNAL_SERVICE_ERROR",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details={"service": service_name, "reason": reason},
        )


def register_exception_handlers(app: FastAPI) -> None:
    """Register global OOP domain exception handlers on a FastAPI instance."""

    @app.exception_handler(DomainException)
    async def domain_exception_handler(_request: Request, exc: DomainException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=exc.to_dict(),
        )
