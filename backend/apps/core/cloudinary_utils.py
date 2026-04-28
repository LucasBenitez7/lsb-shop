"""Helpers for Cloudinary resource deletion from stored URLs."""

from __future__ import annotations

import re


def extract_cloudinary_public_id(url: str) -> str | None:
    """
    Best-effort public_id extraction for res.cloudinary.com image URLs.

    Returns None if the URL does not look like a Cloudinary delivery URL.
    """
    if not url or "res.cloudinary.com" not in url:
        return None
    # /upload/v123/... or /upload/...  → capture path without file extension
    m = re.search(r"/upload/(?:v\d+/)?(.+)", url)
    if not m:
        return None
    path = m.group(1)
    # strip query/hash
    path = path.split("?")[0].split("#")[0]
    # drop extension for destroy() which expects public_id without fmt
    if "." in path:
        path = path.rsplit(".", 1)[0]
    return path or None
