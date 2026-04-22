from django.contrib import admin
from unfold.admin import ModelAdmin

from apps.orders.models import Order, OrderHistory, OrderItem


@admin.register(Order)
class OrderAdmin(ModelAdmin):
    list_display = [
        "id",
        "email",
        "payment_status",
        "fulfillment_status",
        "total_minor",
        "created_at",
    ]
    list_filter = ["payment_status", "fulfillment_status", "is_cancelled"]
    search_fields = ["email", "stripe_payment_intent_id"]
    readonly_fields = [
        "created_at",
        "updated_at",
        "stripe_payment_intent_id",
        "items_total_minor",
        "total_minor",
    ]
    date_hierarchy = "created_at"


@admin.register(OrderItem)
class OrderItemAdmin(ModelAdmin):
    list_display = [
        "id",
        "order",
        "name_snapshot",
        "quantity",
        "subtotal_minor",
    ]
    list_filter = ["order__payment_status"]
    search_fields = ["order__email", "name_snapshot"]
    readonly_fields = [
        "name_snapshot",
        "price_minor_snapshot",
        "size_snapshot",
        "color_snapshot",
        "subtotal_minor",
    ]


@admin.register(OrderHistory)
class OrderHistoryAdmin(ModelAdmin):
    list_display = ["id", "order", "type", "snapshot_status", "actor", "created_at"]
    list_filter = ["type", "actor"]
    search_fields = ["order__email", "snapshot_status"]
    readonly_fields = ["created_at", "order", "type", "snapshot_status", "actor"]
