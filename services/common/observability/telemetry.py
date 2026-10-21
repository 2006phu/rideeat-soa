"""OOP Observability Manager: Correlation IDs, Structured ELK JSON Logs, Prometheus Metrics & OpenTelemetry."""

import contextvars
import json
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Callable

from fastapi import FastAPI, Request, Response
from fastapi.responses import PlainTextResponse

correlation_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("correlation_id", default="")


def get_correlation_id() -> str:
    """Retrieve the active request's distributed correlation ID."""
    return correlation_id_ctx.get() or str(uuid.uuid4())


class ELKJsonLogFormatter(logging.Formatter):
    """Structured JSON log formatter compatible with Elasticsearch / Logstash / Kibana (ELK)."""

    def __init__(self, service_name: str) -> None:
        super().__init__()
        self._service_name = service_name

    def format(self, record: logging.LogRecord) -> str:
        log_record = {
            "@timestamp": datetime.now(timezone.utc).isoformat(),
            "service": self._service_name,
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "correlation_id": correlation_id_ctx.get() or "system",
        }
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_record, ensure_ascii=False)


class ObservabilityManager:
    """Encapsulates Prometheus metrics collection, Correlation ID tracing, and structured logging."""

    def __init__(self, service_name: str, version: str = "1.0.0") -> None:
        self._service_name = service_name
        self._version = version
        self._request_count = 0
        self._error_count = 0
        self._total_latency_ms = 0.0
        self._path_counts: dict[str, int] = {}

    def configure_logging(self) -> None:
        """Configure root logger with structured JSON output for ELK stack."""
        root_logger = logging.getLogger()
        root_logger.setLevel(logging.INFO)
        if not root_logger.handlers:
            handler = logging.StreamHandler()
            handler.setFormatter(ELKJsonLogFormatter(self._service_name))
            root_logger.addHandler(handler)

    def instrument_app(self, app: FastAPI) -> None:
        """Attach Correlation-ID / OpenTelemetry tracing middleware and Prometheus /metrics endpoint."""
        self.configure_logging()
        service_name = self._service_name

        @app.middleware("http")
        async def telemetry_middleware(request: Request, call_next: Callable) -> Response:
            cid = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())
            token = correlation_id_ctx.set(cid)
            start_time = time.perf_counter()
            try:
                response: Response = await call_next(request)
                elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                self._request_count += 1
                self._total_latency_ms += elapsed_ms
                path = request.url.path
                self._path_counts[path] = self._path_counts.get(path, 0) + 1
                if response.status_code >= 500:
                    self._error_count += 1
                response.headers["X-Correlation-ID"] = cid
                response.headers["X-Service-Name"] = service_name
                response.headers["X-Response-Time-Ms"] = f"{elapsed_ms:.2f}"
                return response
            except Exception:
                self._request_count += 1
                self._error_count += 1
                raise
            finally:
                correlation_id_ctx.reset(token)

        @app.get("/metrics", include_in_schema=False)
        async def prometheus_metrics() -> PlainTextResponse:
            """Expose Prometheus-formatted metrics for scraping."""
            avg_latency = (
                self._total_latency_ms / self._request_count if self._request_count > 0 else 0.0
            )
            lines = [
                "# HELP http_requests_total Total number of HTTP requests processed",
                "# TYPE http_requests_total counter",
                f'http_requests_total{{service="{service_name}"}} {self._request_count}',
                "# HELP http_errors_total Total number of HTTP 5xx errors",
                "# TYPE http_errors_total counter",
                f'http_errors_total{{service="{service_name}"}} {self._error_count}',
                "# HELP http_request_duration_ms_avg Average HTTP request latency in ms",
                "# TYPE http_request_duration_ms_avg gauge",
                f'http_request_duration_ms_avg{{service="{service_name}"}} {avg_latency:.2f}',
            ]
            for path, count in self._path_counts.items():
                lines.append(
                    f'http_requests_by_path_total{{service="{service_name}",path="{path}"}} {count}'
                )
            return PlainTextResponse("\n".join(lines) + "\n", media_type="text/plain; version=0.0.4")

        @app.get("/health", tags=["System"])
        async def health_check() -> dict:
            """Standard SOA health check endpoint."""
            return {
                "status": "healthy",
                "service": self._service_name,
                "version": self._version,
                "requests_processed": self._request_count,
            }
