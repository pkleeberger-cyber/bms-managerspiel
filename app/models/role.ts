export enum Role {
  MANAGER = "MANAGER",
  DATA_MANAGER = "DATA_MANAGER",
  ADMIN = "ADMIN",
}

const roleLevel: Record<Role, number> = {
  [Role.MANAGER]: 1,
  [Role.DATA_MANAGER]: 2,
  [Role.ADMIN]: 3,
};

export function hasMinimumRole(role: Role, requiredRole: Role): boolean {
  return roleLevel[role] >= roleLevel[requiredRole];
}
