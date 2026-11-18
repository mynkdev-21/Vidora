/** Browser authentication: in-memory access token, HttpOnly refresh cookie. */
const configuredUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";
export const BASE_URL = typeof window !== "undefined" && import.meta.env.DEV
  ? `${window.location.protocol}//${window.location.hostname}:5001`
  : configuredUrl;
export const API_KEY: string = import.meta.env.VITE_API_KEY || "";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  is_verified?: number;
  avatar_url?: string;
}
interface AuthResponse {
  success: boolean;
  message: string;
  data: { user: AuthUser; accessToken: string; csrfToken: string };
}

let accessToken: string | null = null;
let csrfToken: string | null = null;
let currentUser: AuthUser | null = null;
let refreshPromise: Promise<boolean> | null = null;

export const tokenStore = {
  getAccess: () => accessToken,
  getUser: () => currentUser,
  set(access: string, csrf: string, user: AuthUser) {
    accessToken = access;
    csrfToken = csrf;
    currentUser = user;
    if (typeof window !== "undefined") window.dispatchEvent(new Event("vidora:user-session"));
  },
  updateUser(user: AuthUser) {
    currentUser = user;
    if (typeof window !== "undefined") window.dispatchEvent(new Event("vidora:user-session"));
  },
  clear() {
    accessToken = null;
    csrfToken = null;
    currentUser = null;
    if (typeof window !== "undefined") window.dispatchEvent(new Event("vidora:user-session"));
  },
  clearLegacyStorage() {
    if (typeof window === "undefined") return false;
    const keys = ["vdr_access_token", "vdr_refresh_token", "vdr_user", "__impersonate_token", "__impersonate_user"];
    const hadSession = keys.some((key) => localStorage.getItem(key) !== null);
    keys.forEach((key) => localStorage.removeItem(key));
    if (hadSession) sessionStorage.setItem("vdr_session_updated", "1");
    return hadSession;
  },
};
const userChannel = typeof window !== "undefined" && "BroadcastChannel" in window
  ? new BroadcastChannel("vidora-user-session") : null;
if (userChannel) userChannel.onmessage = (event) => {
  if (event.data === "logout") tokenStore.clear();
};

const browserHeaders = (extra: Record<string, string> = {}) => ({
  "Content-Type": "application/json",
  "X-API-Key": API_KEY,
  "X-Session-Mode": "browser",
  ...extra,
});

async function fetchCsrf(): Promise<string | null> {
  const res = await fetch(`${BASE_URL}/api/auth/browser-csrf`, {
    credentials: "include", headers: browserHeaders(),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.data.csrfToken as string;
}

async function performRefresh(): Promise<boolean> {
  let csrf = await fetchCsrf();
  if (!csrf) return false;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST", credentials: "include",
      headers: browserHeaders({ "X-CSRF-Token": csrf }),
    });
    if (res.ok) {
      const data = await res.json();
      tokenStore.set(data.data.accessToken, data.data.csrfToken, data.data.user);
      return true;
    }
    // Another tab may have rotated the shared cookie. Read its current CSRF
    // proof once; never accept or reuse the already-rotated refresh token.
    if (attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      csrf = await fetchCsrf();
      if (!csrf) return false;
    }
  }
  return false;
}

export async function restoreBrowserSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  const run = async () => {
    if (typeof navigator !== "undefined" && navigator.locks?.request) {
      return navigator.locks.request("vidora-user-refresh", performRefresh);
    }
    return performRefresh();
  };
  refreshPromise = run().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers: Record<string, string> = browserHeaders(options.headers as Record<string, string>);
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(`${BASE_URL}${path}`, { ...options, credentials: "include", headers });
  if (res.status === 401 && retry && !path.startsWith("/api/auth/")) {
    if (await restoreBrowserSession()) return apiFetch<T>(path, options, false);
    tokenStore.clear();
    throw new Error("Session expired. Please log in again.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed." }));
    throw new Error(err.message || "Request failed.");
  }
  return res.json() as Promise<T>;
}

export function apiRegister(name: string, email: string, password: string, referralCode?: string) {
  return apiFetch<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password, referral_code: referralCode || undefined }),
  });
}
export function apiLogin(email: string, password: string) {
  return apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST", body: JSON.stringify({ email, password }),
  });
}
export async function apiLogout() {
  try {
    csrfToken = await fetchCsrf();
    if (!csrfToken) return;
    await fetch(`${BASE_URL}/api/auth/logout`, {
      method: "POST", credentials: "include",
      headers: browserHeaders({ "X-CSRF-Token": csrfToken }),
    });
  } finally {
    tokenStore.clear();
    userChannel?.postMessage("logout");
  }
}
