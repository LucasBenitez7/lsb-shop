import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def _clear_default_cache() -> None:
    """Isolate list-cache keys between tests (LocMem is process-wide)."""
    cache.clear()
    yield
    cache.clear()
