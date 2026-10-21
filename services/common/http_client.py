"""OOP Inter-Service HTTP Client with Correlation ID Propagation and Error Mapping."""

import logging
from typing import Any, Dict, Optional
import httpx

from services.common.exceptions import ExternalServiceException
from services.common.observability.telemetry import get_correlation_id

logger = logging.getLogger(__name__)


class InterServiceHttpClient:
    """Encapsulates asynchronous HTTP communication between SOA microservices."""

    def __init__(self, service_name: str, base_url: str, timeout: float = 8.0) -> None:
        self._service_name = service_name
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout

    @property
    def base_url(self) -> str:
        return self._base_url

    async def request(
        self,
        method: str,
        path: str,
        json_body: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        raise_on_error: bool = False,
    ) -> Optional[Dict[str, Any]]:
        """Perform an HTTP request propagating X-Correlation-ID header."""
        url = f"{self._base_url}/{path.lstrip('/')}"
        req_headers = dict(headers or {})
        req_headers.setdefault("X-Correlation-ID", get_correlation_id())

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.request(
                    method=method.upper(),
                    url=url,
                    json=json_body,
                    params=params,
                    headers=req_headers,
                )
                response.raise_for_status()
                if response.content:
                    return response.json()
                return {}
        except Exception as exc:
            logger.warning(f"Inter-service call to {self._service_name} ({url}) failed: {exc}")
            if raise_on_error:
                raise ExternalServiceException(self._service_name, str(exc))
            return None
