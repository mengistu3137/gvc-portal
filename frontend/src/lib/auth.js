const TOKEN_KEY = 'token';
const USER_KEY = 'auth_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user || null));
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

export function isAuthenticated() {
  return Boolean(getToken());
}
