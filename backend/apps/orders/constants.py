"""
Orders domain constants.

Phase 5 MVP: storefront and checkout API only support **home delivery** (`HOME`).
`ShippingType` in the DB still includes STORE and PICKUP for future use; keep this
set in sync with allowed enum values when those flows ship.
"""

# Must match ShippingType.HOME — checkout serializers/services reject anything else.
ALLOWED_SHIPPING_TYPES_CHECKOUT = frozenset({"HOME"})
