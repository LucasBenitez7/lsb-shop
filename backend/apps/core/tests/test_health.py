import pytest
from django.test import Client


@pytest.mark.django_db
def test_health_json_reports_ok() -> None:
    client = Client()
    response = client.get("/health/", HTTP_ACCEPT="application/json")
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, dict)
    for status in payload.values():
        assert status == "OK", payload
