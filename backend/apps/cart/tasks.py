import structlog
from celery import shared_task
from django.conf import settings

log = structlog.get_logger()


@shared_task
def cleanup_expired_carts() -> None:
    """
    Cart keys use Redis TTL (CART_REDIS_TTL_SECONDS) on each write — expired
    carts are removed automatically. This task exists for observability and
    optional future index cleanup; safe to run daily via Celery Beat.
    """
    ttl = int(getattr(settings, "CART_REDIS_TTL_SECONDS", 604800))
    log.info("carts.cleanup.ran", ttl_seconds=ttl, note="ttl_handles_expiry")
