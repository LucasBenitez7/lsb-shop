"""Pytest root: plugins must be registered here (not in app-level conftest)."""

pytest_plugins = ["apps.users.tests.fixtures"]
