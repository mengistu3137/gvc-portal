import { getAuthUser, getToken } from './auth';

function decodeJwtPayload(token) {
  if (!token) return null;

  try {
    const payloadPart = token.split('.')[1];
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(base64);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function getAuthContext() {
  const user = getAuthUser();
  const token = getToken();
  const tokenPayload = decodeJwtPayload(token);
  const permissions = Array.isArray(tokenPayload?.permissions) ? tokenPayload.permissions : [];
  const roles = Array.isArray(tokenPayload?.roles) ? tokenPayload.roles : [];
  const isAdmin =
    String(user?.email || '').toLowerCase() === 'admin@gvc.edu' ||
    roles.includes('ADMIN') ||
    roles.includes('SUPER_ADMIN');

  return {
    user,
    roles,
    permissions,
    isAdmin,
  };
}

export function hasPermission(permissionCode) {
  const { permissions, isAdmin } = getAuthContext();
  if (isAdmin) return true;
  return permissions.includes(permissionCode);
}
