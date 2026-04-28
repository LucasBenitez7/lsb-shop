"""Cart domain constants (Redis keys, TTL)."""

# Cache key prefixes — keep stable for ops / Celery scans
CART_USER_KEY_PREFIX = "cart:user:"
CART_GUEST_KEY_PREFIX = "cart:guest:"
