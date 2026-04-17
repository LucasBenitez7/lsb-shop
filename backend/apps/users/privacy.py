"""PII masking for staff *demo* role when serializing *other* users' data."""

from __future__ import annotations


def mask_email_for_demo(email: str | None) -> str:
    """
    Match storefront demo UX: juan@gmail.com → j***@***.com (see frontend mask-email).
    """
    if not email or not str(email).strip():
        return ""
    normalized = str(email).strip().lower()
    at = normalized.find("@")
    if at <= 0:
        return "***"
    local = normalized[:at]
    domain = normalized[at + 1 :]
    if not local or not domain:
        return "***"
    first = local[0]
    domain_parts = domain.split(".")
    tld = domain_parts[-1] if domain_parts else ""
    if not tld:
        return f"{first}***@***"
    return f"{first}***@***.{tld}"


def mask_phone_for_demo(phone: str | None) -> str:
    """Do not expose real phone numbers to demo staff for other users."""
    if not phone or not str(phone).strip():
        return ""
    return "***"
