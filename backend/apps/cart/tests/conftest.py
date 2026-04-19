import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def clear_cart_cache() -> None:
    cache.clear()
    yield
    cache.clear()
