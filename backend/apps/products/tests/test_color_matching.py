import pytest

from apps.products.color_matching import (
    color_match_key,
    colors_equivalent,
    normalize_color_label,
)


def test_normalize_collapses_whitespace_and_casefolds() -> None:
    assert normalize_color_label("  Navy   Blue  ") == "navy blue"


@pytest.mark.parametrize(
    ("a", "b"),
    [
        ("Rojo", "red"),
        ("ROJO", "Red"),
        ("Azul", "blue"),
        ("NEGRO", "black"),
    ],
)
def test_colors_equivalent_synonyms(a: str, b: str) -> None:
    assert colors_equivalent(a, b) is True


def test_colors_equivalent_unrelated() -> None:
    assert colors_equivalent("Rojo", "Verde") is False


def test_colors_equivalent_empty_not_equal_to_named() -> None:
    assert colors_equivalent("", "red") is False
    assert colors_equivalent(None, "red") is False


def test_color_match_key_stable_for_synonyms() -> None:
    assert color_match_key("rojo") == color_match_key("red")
