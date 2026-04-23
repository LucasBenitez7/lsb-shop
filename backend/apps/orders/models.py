from django.db import models

from apps.core.models import TimeStampedModel


class PaymentStatus(models.TextChoices):
    PENDING = "PENDING", "Pendiente"
    PAID = "PAID", "Pagado"
    REFUNDED = "REFUNDED", "Reembolsado"
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED", "Parcialmente reembolsado"
    FAILED = "FAILED", "Fallido"


class FulfillmentStatus(models.TextChoices):
    UNFULFILLED = "UNFULFILLED", "Sin cumplir"
    PREPARING = "PREPARING", "Preparando"
    READY_FOR_PICKUP = "READY_FOR_PICKUP", "Listo para recoger"
    SHIPPED = "SHIPPED", "Enviado"
    DELIVERED = "DELIVERED", "Entregado"
    RETURNED = "RETURNED", "Devuelto"


class ShippingType(models.TextChoices):
    """Stored on Order; MVP APIs only accept HOME — see apps.orders.constants."""

    HOME = "HOME", "Domicilio"
    STORE = "STORE", "Tienda"
    PICKUP = "PICKUP", "Punto de recogida"


class HistoryType(models.TextChoices):
    STATUS_CHANGE = "STATUS_CHANGE", "Cambio de estado"
    INCIDENT = "INCIDENT", "Incidencia"


class Order(TimeStampedModel):
    """
    Order with immutable contact/address snapshots.
    Guest orders have user=null, tracked via OTP (guest_access_code).
    """

    user = models.ForeignKey(
        "users.User",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="orders",
    )

    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        db_index=True,
    )
    fulfillment_status = models.CharField(
        max_length=20,
        choices=FulfillmentStatus.choices,
        default=FulfillmentStatus.UNFULFILLED,
        db_index=True,
    )
    is_cancelled = models.BooleanField(default=False, db_index=True)

    items_total_minor = models.IntegerField()
    shipping_cost_minor = models.IntegerField(default=0)
    tax_minor = models.IntegerField(default=0)
    total_minor = models.IntegerField()
    currency = models.CharField(max_length=3, default="EUR")

    stripe_payment_intent_id = models.CharField(
        max_length=255,
        unique=True,
        null=True,
        blank=True,
    )
    payment_method = models.CharField(max_length=100, blank=True)
    # Snapshot from Stripe when card payment succeeds (for receipts / order detail UI).
    card_brand = models.CharField(max_length=32, blank=True, default="")
    card_last4 = models.CharField(max_length=4, blank=True, default="")

    carrier = models.CharField(max_length=100, blank=True)
    tracking_number = models.CharField(max_length=100, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)

    return_reason = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)
    return_tracking_id = models.CharField(max_length=100, blank=True)

    guest_access_code = models.CharField(max_length=6, blank=True)
    guest_access_code_expiry = models.DateTimeField(null=True, blank=True)

    email = models.EmailField(db_index=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True)

    street = models.CharField(max_length=255)
    # API checkout requires non-empty delivery detail (floor, door, etc.).
    address_extra = models.CharField(max_length=255, blank=True)
    postal_code = models.CharField(max_length=20)
    province = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=2, default="ES")

    shipping_type = models.CharField(
        max_length=10,
        choices=ShippingType.choices,
        default=ShippingType.HOME,
    )
    # Reserved for STORE / PICKUP flows (not implemented in API or storefront yet).
    store_location_id = models.CharField(max_length=100, blank=True)
    pickup_location_id = models.CharField(max_length=100, blank=True)
    pickup_search = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["email", "-created_at"]),
            models.Index(fields=["payment_status", "fulfillment_status"]),
        ]

    def __str__(self) -> str:
        return f"Order #{self.pk} - {self.email}"


class OrderItem(TimeStampedModel):
    """
    Line item with immutable snapshots (price, name, size, color at purchase time).
    """

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")

    product = models.ForeignKey(
        "products.Product",
        on_delete=models.PROTECT,
        related_name="order_items",
    )
    variant = models.ForeignKey(
        "products.ProductVariant",
        on_delete=models.PROTECT,
        related_name="order_items",
    )

    name_snapshot = models.CharField(max_length=255)
    price_minor_snapshot = models.IntegerField()
    # Catalog compare-at per unit (minor), if above variant price at checkout.
    compare_at_unit_minor_snapshot = models.IntegerField(null=True, blank=True)
    size_snapshot = models.CharField(max_length=50, blank=True)
    color_snapshot = models.CharField(max_length=50, blank=True)

    quantity = models.IntegerField()
    subtotal_minor = models.IntegerField()

    quantity_returned = models.IntegerField(default=0)
    quantity_return_requested = models.IntegerField(default=0)

    class Meta:
        ordering = ["id"]

    def __str__(self) -> str:
        return f"{self.name_snapshot} x{self.quantity}"


class OrderHistory(models.Model):
    """
    Audit log for order events (status changes, cancellations, returns).
    """

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="history")
    created_at = models.DateTimeField(auto_now_add=True)

    type = models.CharField(max_length=20, choices=HistoryType.choices)
    snapshot_status = models.CharField(max_length=255)
    reason = models.TextField(blank=True)
    actor = models.CharField(max_length=50)
    details = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Order histories"

    def __str__(self) -> str:
        return f"{self.order_id} - {self.snapshot_status}"
