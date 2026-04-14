export const USER_ROLES = ["admin", "user", "demo"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ADMIN_ROLES = ["admin", "demo"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export function canAccessAdmin(role: string | undefined): boolean {
  return role === "admin" || role === "demo";
}

export function canWriteAdmin(role: string | undefined): boolean {
  return role === "admin";
}

export function isDemoRole(role: string | undefined): boolean {
  return role === "demo";
}
