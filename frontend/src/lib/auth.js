const TOKEN_KEY = 'token';
const USER_KEY = 'auth_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthSession(token, user, permissions = [], roles = []) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify({ ...user, permissions, roles }));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getAuthUser() {
  const value = localStorage.getItem(USER_KEY);
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function hasPermission(permissionCode) {
  const user = getAuthUser();
  if (!user || !user.permissions) return false;
  return user.permissions.includes(permissionCode);
}

export function hasRole(roleCode) {
  const user = getAuthUser();
  if (!user?.roles) return false;

  const rolesToCheck = Array.isArray(roleCode) ? roleCode : [roleCode];
  
  // Convert everything to Uppercase for comparison
  return rolesToCheck.some(role => 
    user.roles.some(userRole => userRole.toUpperCase() === role.toUpperCase())
  );
}

export function isAuthenticated() {
  return Boolean(getToken());
}
