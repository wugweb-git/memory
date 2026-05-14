export type Role = "admin" | "operator" | "user";

const PERMISSIONS: Record<Role, string[]> = {
  admin: ["publish", "schedule", "admin:read"],
  operator: ["publish", "schedule"],
  user: ["schedule"],
};

export function hasPermission(role: string, permission: string) {
  const normalized = (role as Role) in PERMISSIONS ? (role as Role) : "user";
  return PERMISSIONS[normalized].includes(permission);
}
