"""
django-health-check 4.x wiring.

There is no ``health_check.urls``; mount ``HealthCheckView`` (or a subclass).
"""

from __future__ import annotations

from collections.abc import Generator
from datetime import timedelta
from typing import Any

from django.conf import settings
from django.utils.module_loading import import_string
from health_check.base import HealthCheck
from health_check.views import HealthCheckView


class LivenessHealthCheckView(HealthCheckView):
    """
    Readiness checks for load balancers: database, default cache, optional Celery.

    Omits Mail, DNS, and storage probes — they often fail or add latency when
    only core dependencies matter. Celery ping is gated by
    ``settings.HEALTH_CHECK_CELERY_PING`` (off in tests and dev by default).
    """

    def get_checks(self) -> Generator[HealthCheck]:
        specs: list[str | tuple[str, dict[str, Any]]] = [
            "health_check.checks.Database",
            "health_check.checks.Cache",
        ]
        if getattr(settings, "HEALTH_CHECK_CELERY_PING", False):
            specs.append(
                (
                    "health_check.contrib.celery.Ping",
                    {"timeout": timedelta(seconds=10)},
                ),
            )
        for spec in specs:
            try:
                check, options = spec  # type: ignore[misc]
            except (ValueError, TypeError):
                check = spec
                options = {}
            if isinstance(check, str):
                check = import_string(check)
            yield check(**options)
