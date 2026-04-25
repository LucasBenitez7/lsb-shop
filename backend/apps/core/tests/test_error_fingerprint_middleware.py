from django.core.cache import cache
from django.http import HttpResponse
from django.test import RequestFactory, override_settings

from apps.core.middleware import (
    ErrorFingerprintMiddleware,
    bump_error_fingerprint,
    error_fingerprint_cache_key,
    error_fingerprint_digest,
    should_record_error_fingerprint,
)


def test_should_record_skips_health_and_static() -> None:
    assert should_record_error_fingerprint(path="/health/", status_code=503) is False
    assert (
        should_record_error_fingerprint(path="/static/x.css", status_code=500) is False
    )
    assert should_record_error_fingerprint(path="/api/v1/x/", status_code=500) is True
    assert should_record_error_fingerprint(path="/api/v1/x/", status_code=404) is False


def test_bump_error_fingerprint_increments() -> None:
    cache.clear()
    d = "abc123testdigest0000"
    assert bump_error_fingerprint(digest=d) == 1
    assert bump_error_fingerprint(digest=d) == 2
    cache.delete(error_fingerprint_cache_key(d))


@override_settings(ERROR_FINGERPRINT_ENABLED=True)
def test_middleware_logs_500_and_bumps_counter() -> None:
    cache.clear()
    rf = RequestFactory()

    def get_response(_request):
        return HttpResponse("err", status=503)

    mw = ErrorFingerprintMiddleware(get_response)
    path = "/api/v1/orders/"
    mw(rf.get(path))

    digest = error_fingerprint_digest(method="GET", path=path, status_code=503)
    key = error_fingerprint_cache_key(digest)
    assert cache.get(key) == 1

    mw(rf.get(path))
    assert cache.get(key) == 2
    cache.delete(key)


@override_settings(ERROR_FINGERPRINT_ENABLED=False)
def test_middleware_disabled_skips_counter() -> None:
    cache.clear()
    rf = RequestFactory()

    def get_response(_request):
        return HttpResponse("err", status=500)

    mw = ErrorFingerprintMiddleware(get_response)
    path = "/api/v1/cart/"
    mw(rf.get(path))
    digest = error_fingerprint_digest(method="GET", path=path, status_code=500)
    assert cache.get(error_fingerprint_cache_key(digest)) is None
