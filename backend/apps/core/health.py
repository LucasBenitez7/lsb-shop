"""
django-health-check 4.x wiring.

There is no ``health_check.urls``; mount ``HealthCheckView`` (or a subclass).
"""

from typing import ClassVar

from health_check.base import HealthCheck
from health_check.views import HealthCheckView


class LivenessHealthCheckView(HealthCheckView):
    """
    Minimal checks for load balancers and orchestrators.

    Default ``HealthCheckView`` also runs DNS, mail, and storage probes, which
    often fail or add latency in environments where only DB + Redis matter.
    """

    checks: ClassVar[
        tuple[
            type[HealthCheck] | str | tuple[type[HealthCheck] | str, dict[str, object]],
            ...,
        ]
    ] = (
        "health_check.checks.Database",
        "health_check.checks.Cache",
    )
