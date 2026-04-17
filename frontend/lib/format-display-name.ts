/**
 * Storefront display: uppercase the first character only; leave the rest
 * exactly as stored (admin intent after position 0). Trims surrounding
 * whitespace only for the operation; internal spacing is preserved.
 *
 * Do not use for admin edit forms — keep raw DB values there.
 */
export function formatDisplayName(value: string | null | undefined): string {
  if (value == null) return "";
  const trimmed = value.trim();
  if (trimmed === "") return "";
  const first = trimmed.charAt(0).toLocaleUpperCase("es");
  return first + trimmed.slice(1);
}
