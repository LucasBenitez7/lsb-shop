"""
Product list filters.

Requires a queryset annotated with ``min_price`` (see ``product_list_queryset``) so
``min_price`` / ``max_price`` apply to the cheapest *active* variant per product,
avoiding the "bridge" effect (different variants satisfying each bound separately).

Variant filters read ``colors`` / ``sizes`` (repeatable query keys) or ``color`` /
``size`` (single). When both color and size constraints exist, one variant row must
match (color in selected colors AND size in selected sizes).
"""

from datetime import timedelta
from decimal import Decimal, InvalidOperation
from typing import Any

import django_filters
from django.db.models import Exists, OuterRef
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.products.models import Product, ProductVariant

RECENT_DAYS_MAX = 365


class NumberInFilter(django_filters.BaseInFilter, django_filters.NumberFilter):
    """Comma-separated or repeated query values for numeric ``__in`` lookups."""

    pass


def _parse_decimal_param(raw: object) -> Decimal | None:
    if raw is None or raw == "":
        return None
    try:
        return Decimal(str(raw))
    except (InvalidOperation, TypeError, ValueError):
        return None


def _collect_list(qd: Any, *keys: str) -> list[str]:
    """Merge repeated keys (e.g. colors=M&colors=L) and single-key fallbacks."""
    seen: set[str] = set()
    out: list[str] = []
    for key in keys:
        if hasattr(qd, "getlist"):
            for v in qd.getlist(key):
                s = str(v).strip()
                if s and s not in seen:
                    seen.add(s)
                    out.append(s)
        else:
            v = qd.get(key)
            if v:
                s = str(v).strip()
                if s and s not in seen:
                    seen.add(s)
                    out.append(s)
    return out


class ProductFilter(django_filters.FilterSet):
    id = django_filters.NumberFilter(field_name="id")
    is_archived = django_filters.BooleanFilter(field_name="is_archived")
    category = NumberInFilter(field_name="category_id", lookup_expr="in")
    category_slug = django_filters.CharFilter(
        field_name="category__slug",
        lookup_expr="iexact",
    )
    min_price = django_filters.CharFilter(method="filter_min_price")
    max_price = django_filters.CharFilter(method="filter_max_price")
    featured = django_filters.BooleanFilter(field_name="is_featured")
    recent_days = django_filters.NumberFilter(method="filter_recent_days")
    on_sale = django_filters.BooleanFilter(method="filter_on_sale")
    out_of_stock = django_filters.BooleanFilter(method="filter_out_of_stock")

    class Meta:
        model = Product
        fields = [
            "id",
            "is_archived",
            "category",
            "category_slug",
            "min_price",
            "max_price",
            "featured",
            "recent_days",
            "on_sale",
            "out_of_stock",
        ]

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        return self._filter_by_variants(queryset)

    def _filter_by_variants(self, queryset):
        qd = self.data
        color_vals = _collect_list(qd, "colors", "color")
        size_vals = _collect_list(qd, "sizes", "size")
        if not color_vals and not size_vals:
            return queryset

        vbase = ProductVariant.objects.filter(
            product_id=OuterRef("pk"),
            is_active=True,
        )
        if color_vals and size_vals:
            vbase = vbase.filter(color__in=color_vals, size__in=size_vals)
        elif color_vals:
            vbase = vbase.filter(color__in=color_vals)
        else:
            vbase = vbase.filter(size__in=size_vals)
        return queryset.filter(Exists(vbase))

    def filter_min_price(self, queryset, name, value):
        del name
        if value is None or value == "":
            return queryset
        dec = _parse_decimal_param(value)
        if dec is None:
            raise ValidationError(
                {"min_price": "Enter a valid decimal number."},
            )
        return queryset.filter(min_price__gte=dec)

    def filter_max_price(self, queryset, name, value):
        del name
        if value is None or value == "":
            return queryset
        dec = _parse_decimal_param(value)
        if dec is None:
            raise ValidationError(
                {"max_price": "Enter a valid decimal number."},
            )
        return queryset.filter(min_price__lte=dec)

    def filter_recent_days(self, queryset, name, value):
        del name
        if value is None or value == "":
            return queryset
        try:
            days = int(value)
        except (TypeError, ValueError):
            raise ValidationError(
                {"recent_days": "Enter a valid integer."},
            ) from None
        if days < 1 or days > RECENT_DAYS_MAX:
            raise ValidationError(
                {
                    "recent_days": (f"Must be between 1 and {RECENT_DAYS_MAX}."),
                },
            )
        cutoff = timezone.now() - timedelta(days=days)
        recent = queryset.filter(created_at__gte=cutoff)
        raw_fb = self.data.get("recent_fallback")
        fallback = raw_fb is not None and str(raw_fb).lower() in (
            "1",
            "true",
            "yes",
        )
        if fallback and not recent.exists():
            return queryset
        return recent

    def filter_on_sale(self, queryset, name, value):
        """Filter products with an active sale price (compare_at_price is set)."""
        del name
        if value is None:
            return queryset
        if value:
            return queryset.filter(compare_at_price__isnull=False)
        return queryset.filter(compare_at_price__isnull=True)

    def filter_out_of_stock(self, queryset, name, value):
        """Filter products that have no active variant with stock > 0."""
        del name
        if value is None:
            return queryset
        has_stock = ProductVariant.objects.filter(
            product_id=OuterRef("pk"),
            is_active=True,
            stock__gt=0,
        )
        if value:
            return queryset.filter(~Exists(has_stock))
        return queryset.filter(Exists(has_stock))
