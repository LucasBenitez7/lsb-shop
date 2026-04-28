"""
Light smoke load test for the HTTP API.

Run locally (API on 8000):

  cd backend && uv run locust -f loadtesting/locustfile.py \\
    --host http://127.0.0.1:8000 --headless -u 10 -r 2 -t 30s

Requires a running Django instance with the same DB the tests use is not
necessary — point --host at staging or local runserver.
"""

from __future__ import annotations

from locust import HttpUser, between, task


class SmokeUser(HttpUser):
    wait_time = between(0.3, 1.2)

    @task(4)
    def health(self) -> None:
        self.client.get("/health/", name="GET /health/")

    @task(1)
    def products_list(self) -> None:
        self.client.get(
            "/api/v1/products/?page=1&page_size=6",
            name="GET /api/v1/products/",
        )
