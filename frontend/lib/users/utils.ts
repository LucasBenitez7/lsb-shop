/**
 * Single-line display name from DRF `User` fields.
 * Returns empty string when both names are missing or blank.
 */
export function formatUserDisplayName(user: {
  first_name?: string | null;
  last_name?: string | null;
}): string {
  return [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
}
