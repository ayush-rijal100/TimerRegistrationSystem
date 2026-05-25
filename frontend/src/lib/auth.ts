//takes that jwt token and saves it securely in the browser's local storage (trs_token, trs_user)
import type { AuthUser, LoginResponse, UserRole } from "@/lib/types";

const TOKEN_STORAGE_KEY = "trs_token";
const USER_STORAGE_KEY = "trs_user";

export function getStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawUser = window.localStorage.getItem(USER_STORAGE_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    clearAuthSession();
    return null;
  }
}

export function saveAuthSession(response: LoginResponse) {
  const user: AuthUser = {
    userId: response.userId,
    fullName: response.fullName,
    email: response.email,
    role: response.role,
  };

  window.localStorage.setItem(TOKEN_STORAGE_KEY, response.token);
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

  return user;
}

export function clearAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(USER_STORAGE_KEY);
}

export function getRoleHomePath(role: UserRole) {
  if (role === "EMPLOYEE") {
    return "/employee/timesheet";
  }

  if (role === "MANAGER") {
    return "/manager/reports";
  }

  return "/admin"; 
}
