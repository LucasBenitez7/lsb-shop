"""
Public product list response cache (Redis via Django cache).

Only anonymous / non-staff list GET responses are cached. A monotonic version key
is incremented on catalog writes so we never rely on ``delete_pattern`` (not
available on LocMemCache used in tests).
"""

from __future__ import annotations

import hashlib
import json
from typing import Any

import structlog
from decouple import config
from django.core.cache import cache
from django.db import transaction
from django.http import QueryDict

log = structlog.get_logger()

_VERSION_KEY = "products:list:public:ver"


def product_list_cache_ttl_seconds() -> int:
    return config("PRODUCT_LIST_CACHE_TTL", default=120, cast=int)


def bump_public_product_list_cache() -> None:
    """Invalidate all cached public list pages (cheap version bump)."""
    try:
        cache.incr(_VERSION_KEY)
    except ValueError:
        cache.set(_VERSION_KEY, 1, timeout=None)
    log.debug("products.list_cache.bumped")


def schedule_bump_public_product_list_cache() -> None:
    """
    Schedule cache invalidation after the current DB transaction commits.

    If the transaction rolls back, the bump is skipped. If there is no open
    transaction, Django runs the callback immediately.
    """
    transaction.on_commit(bump_public_product_list_cache)


def _normalize_query_params(query: QueryDict) -> str:
    items: list[tuple[str, str]] = []
    for key in sorted(query.keys()):
        for value in sorted(str(v) for v in query.getlist(key)):
            items.append((key, value))
    return json.dumps(items, separators=(",", ":"))


def public_product_list_cache_key(*, query_params: QueryDict) -> str:
    version_raw = cache.get(_VERSION_KEY)
    version = int(version_raw) if version_raw is not None else 0
    raw = _normalize_query_params(query_params)
    digest = hashlib.sha256(raw.encode()).hexdigest()[:32]
    return f"products:list:public:{version}:{digest}"


def get_cached_public_list(key: str) -> Any | None:
    return cache.get(key)


def set_cached_public_list(key: str, payload: Any) -> None:
    ttl = product_list_cache_ttl_seconds()
    cache.set(key, payload, timeout=ttl)
