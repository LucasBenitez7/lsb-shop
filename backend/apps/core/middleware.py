"""HTTP middleware for operational diagnostics."""

from __future__ import annotations

import hashlib
from collections.abc import Callable

import structlog
from django.conf import settings
from django.core.cache import cache
from django.http import HttpRequest, HttpResponseBase

log = structlog.get_logger()


def error_fingerprint_cache_key(digest: str) -> str:
    return f"errfp:v1:{digest}"


def error_fingerprint_digest(*, method: str, path: str, status_code: int) -> str:
    """Stable short hash: same route + status groups recurring failures."""
    raw = f"{method.upper()}|{status_code}|{path[:512]}"
    return hashlib.sha256(raw.encode()).hexdigest()[:20]


def bump_error_fingerprint(*, digest: str) -> int:
    """
    Increment Redis/LocMem counter for this fingerprint; set TTL on first write.

    Returns the new count (>= 1).
    """
    ttl = int(getattr(settings, "ERROR_FINGERPRINT_TTL_SECONDS", 86400))
    key = error_fingerprint_cache_key(digest)
    if cache.add(key, 1, timeout=ttl):
        return 1
    try:
        return int(cache.incr(key))
    except ValueError:
        cache.set(key, 1, timeout=ttl)
        return 1


def should_record_error_fingerprint(*, path: str, status_code: int) -> bool:
    if status_code < 500:
        return False
    if path.startswith("/health/"):
        return False
    if path.startswith("/static/"):
        return False
    if path.startswith("/favicon"):
        return False
    return True


class ErrorFingerprintMiddleware:
    """
    After the view runs, record HTTP 5xx responses with a Redis-backed counter.

    Uses a fingerprint of ``method + status + path`` (path truncated) so similar
    failures aggregate without storing bodies, query strings, or user data.
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponseBase]):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponseBase:
        response = self.get_response(request)
        if not getattr(settings, "ERROR_FINGERPRINT_ENABLED", True):
            return response
        status = getattr(response, "status_code", 0) or 0
        path = request.path or ""
        if not should_record_error_fingerprint(path=path, status_code=status):
            return response
        digest = error_fingerprint_digest(
            method=request.method,
            path=path,
            status_code=status,
        )
        count = bump_error_fingerprint(digest=digest)
        log.warning(
            "http.server_error",
            method=request.method,
            path=path[:200],
            status_code=status,
            fingerprint=digest,
            fingerprint_count=count,
        )
        return response
