import structlog
from celery import shared_task

log = structlog.get_logger()


@shared_task
def cleanup_expired_carts() -> None:
    """Clean up expired carts from Redis. Celery Beat: daily at 3am."""
    # TODO: implement in Phase 3
    log.info("carts.cleanup.called")
