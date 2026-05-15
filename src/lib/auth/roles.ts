export const userRoles = ["admin", "member"] as const;

export type Role = (typeof userRoles)[number];

export function isRole(value: string): value is Role {
  return userRoles.includes(value as Role);
}

export function normalizeRole(value: string | null | undefined): Role {
  if (value === "ADMIN" || value === "admin") {
    return "admin";
  }

  return "member";
}
