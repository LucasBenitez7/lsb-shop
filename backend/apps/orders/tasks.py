import structlog
from celery import shared_task

log = structlog.get_logger()


@shared_task
def expire_pending_orders() -> None:
    """Expires pending orders older than 30 minutes. Celery Beat: every 15min."""
    # TODO: implement in Phase 4
    log.info("orders.expire_pending.called")


@shared_task
def send_order_confirmation(order_id: int) -> None:
    """Send order confirmation email. Called after order creation."""
    # TODO: implement in Phase 4
    log.info("order.confirmation.called", order_id=order_id)
