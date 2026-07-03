/**
 * Centralized API client for Videora backend
 * Automatically attaches API key + JWT access token to every request.
 * Handles token refresh transparently on 401.
 */

const BASE_URL  = import.meta.env.VITE_API_URL || "http://localhost:5001";
// API key is NOT stored in frontend — backend allows requests from frontend origin without key

export { BASE_URL };

const ACCESS_TOKEN_KEY  = "vdr_access_token";
const REFRESH_TOKEN_KEY = "vdr_refresh_token";
const USER_KEY          = "vdr_user";

// ── Token helpers ─────────────────────────────────────────────────────────────
export const tokenStore = {
  getAccess:      () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefresh:     () => localStorage.getItem(REFRESH_TOKEN_KEY),
  getUser:        () => { try { const s = localStorage.getItem(USER_KEY); return s ? JSON.parse(s) : null; } catch { return null; } },
  set(accessToken: string, refreshToken: string, user: object) {
    localStorage.setItem(ACCESS_TOKEN_KEY,  accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(USER_KEY,          JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

// ── Core fetch wrapper ────────────────────────────────────────────────────────
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

async function tryRefresh(): Promise<string | null> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) return null;

  const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ refreshToken }),
  });

  if (!res.ok) { tokenStore.clear(); return null; }

  const data = await res.json();
  const { accessToken, refreshToken: newRefresh } = data.data;
  const user = tokenStore.getUser();
  tokenStore.set(accessToken, newRefresh, user);
  return accessToken;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const accessToken = tokenStore.getAccess();
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // Token expired — try refresh once
  if (res.status === 401 && retry) {
    const data = await res.json().catch(() => ({}));

    // Account banned — force logout
    if (data?.code === "ACCOUNT_BANNED") {
      tokenStore.clear();
      window.location.href = "/login";
      throw new Error(data.message || "Your account has been banned.");
    }

    if (data?.code !== "TOKEN_EXPIRED") {
      // Regular auth error (wrong password, invalid token, etc.)
      throw new Error(data?.message || "Invalid email or password.");
    }

    if (data?.code === "TOKEN_EXPIRED") {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          refreshQueue.push(async (newToken) => {
            try {
              resolve(await apiFetch<T>(path, options, false));
            } catch (e) { reject(e); }
          });
        });
      }

      isRefreshing = true;
      const newToken = await tryRefresh();
      isRefreshing = false;

      if (newToken) {
        refreshQueue.forEach((cb) => cb(newToken));
        refreshQueue = [];
        return apiFetch<T>(path, options, false);
      }

      // Refresh failed — clear session
      tokenStore.clear();
      window.location.href = "/login";
      throw new Error("Session expired. Please log in again.");
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed." }));
    throw new Error(err.message || "Request failed.");
  }

  return res.json() as Promise<T>;
}

// ── Auth API calls ────────────────────────────────────────────────────────────
export interface AuthUser {
  id:    string;
  name:  string;
  email: string;
  role:  string;
  is_verified?: number;
  avatar_url?: string;
}

interface AuthResponse {
  success: boolean;
  message: string;
  data: { user: AuthUser; accessToken: string; refreshToken: string };
}

export async function apiRegister(name: string, email: string, password: string, referralCode?: string) {
  return apiFetch<AuthResponse>("/api/auth/register", {
    method: "POST",
    body:   JSON.stringify({ name, email, password, referral_code: referralCode || undefined }),
  });
}

export async function apiLogin(email: string, password: string) {
  return apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body:   JSON.stringify({ email, password }),
  });
}

export async function apiLogout(refreshToken: string) {
  return apiFetch("/api/auth/logout", {
    method: "POST",
    body:   JSON.stringify({ refreshToken }),
  }).catch(() => {}); // best-effort
}
