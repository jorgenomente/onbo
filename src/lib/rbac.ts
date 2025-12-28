export type Role = 'platform_owner' | 'org_admin' | 'trainer' | 'employee';

export function isAdminLike(role: Role) {
  return role === 'org_admin' || role === 'trainer';
}

export function isOrgAdmin(role: Role) {
  return role === 'org_admin';
}

export function isEmployee(role: Role) {
  return role === 'employee';
}

export function canEditContent(role: Role) {
  return role === 'org_admin' || role === 'trainer';
}
