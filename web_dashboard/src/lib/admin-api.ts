/**
 * Admin API client — uses separate admin token (from admins table)
 */

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

const ADMIN_TOKEN_KEY = "vdr_admin_token";
const ADMIN_USER_KEY = "vdr_admin_user";

export const adminTokenStore = {
  getToken: () => localStorage.getItem(ADMIN_TOKEN_KEY),
  getAdmin: () => { try { const s = localStorage.getItem(ADMIN_USER_KEY); return s ? JSON.parse(s) : null; } catch { return null; } },
  set(token: string, admin: object) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(admin));
  },
  clear() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
  },
};

export async function adminFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const token = adminTokenStore.getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && !path.includes("/auth/login")) {
    adminTokenStore.clear();
    // Don't redirect — AdminLayout will show 404 on next render
    throw new Error("Admin session expired.");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed." }));
    throw new Error(err.message || "Request failed.");
  }

  return res.json() as Promise<T>;
}
