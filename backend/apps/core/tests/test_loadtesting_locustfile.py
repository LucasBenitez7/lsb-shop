"""Locust smoke file must stay valid Python (do not import locust under pytest)."""

from __future__ import annotations

import py_compile
from pathlib import Path


def test_locust_smoke_file_compiles() -> None:
    root = Path(__file__).resolve().parents[3] / "loadtesting" / "locustfile.py"
    py_compile.compile(str(root), doraise=True)
