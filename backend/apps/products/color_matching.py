"""Shared color label normalization for variant / image / order snapshot matching.

Keep synonym groups in sync with ``frontend/lib/products/color-matching.ts``.
"""

from __future__ import annotations

import unicodedata

# Normalized tokens (casefold, collapsed whitespace) that should match each other.
_COLOR_SYNONYM_GROUPS: tuple[frozenset[str], ...] = (
    frozenset({"red", "rojo", "rosso"}),
    frozenset({"blue", "azul", "bleu"}),
    frozenset({"green", "verde"}),
    frozenset({"black", "negro", "noir"}),
    frozenset({"white", "blanco", "blanc"}),
    frozenset({"yellow", "amarillo", "jaune"}),
    frozenset({"orange", "naranja", "arancione"}),
    frozenset({"purple", "morado", "violet", "violeta", "lila"}),
    frozenset({"pink", "rosa"}),
    frozenset({"brown", "marrón", "marron"}),
    frozenset({"gray", "grey", "gris"}),
    frozenset({"beige"}),
    frozenset({"navy", "marine", "marino"}),
)

_CANONICAL_BY_TOKEN: dict[str, str] = {}
for _group in _COLOR_SYNONYM_GROUPS:
    _canonical = min(_group)
    for _term in _group:
        _CANONICAL_BY_TOKEN[_term] = _canonical


def normalize_color_label(value: str | None) -> str:
    """NFC unicode, trim, collapse internal whitespace, casefold."""
    if value is None:
        return ""
    s = unicodedata.normalize("NFC", str(value).strip())
    return " ".join(s.split()).casefold()


def color_match_key(value: str | None) -> str:
    """Stable key for equality: synonyms map to the same key."""
    n = normalize_color_label(value)
    if not n:
        return ""
    return _CANONICAL_BY_TOKEN.get(n, n)


def colors_equivalent(a: str | None, b: str | None) -> bool:
    """True when both sides are non-empty and refer to the same color label."""
    ka, kb = color_match_key(a), color_match_key(b)
    return bool(ka) and bool(kb) and ka == kb
