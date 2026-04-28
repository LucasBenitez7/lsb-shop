import pytest
from django.test import Client
from django.test.utils import override_settings


@pytest.mark.django_db
def test_health_json_reports_ok() -> None:
    client = Client()
    response = client.get("/health/", HTTP_ACCEPT="application/json")
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, dict)
    for status in payload.values():
        assert status == "OK", payload
    # DB + cache only when HEALTH_CHECK_CELERY_PING is False (test settings).
    assert len(payload) == 2


@pytest.mark.django_db
@override_settings(HEALTH_CHECK_CELERY_PING=True)
def test_health_json_includes_celery_when_enabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def _noop_run(self: object) -> None:
        return None

    monkeypatch.setattr(
        "health_check.contrib.celery.Ping.run",
        _noop_run,
        raising=True,
    )
    client = Client()
    response = client.get("/health/", HTTP_ACCEPT="application/json")
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 3
    for status in payload.values():
        assert status == "OK", payload
