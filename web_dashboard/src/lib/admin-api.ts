/** Admin sessions use a separate cookie and in-memory access token. */
import { API_KEY, BASE_URL } from "./api";

interface Admin { id: string; name: string; email: string }
let token: string | null = null;
let admin: Admin | null = null;
let csrfToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

export const adminTokenStore = {
  getToken: () => token,
  getAdmin: () => admin,
  set(nextToken: string, nextAdmin: Admin, nextCsrf: string) {
    token = nextToken; admin = nextAdmin; csrfToken = nextCsrf;
    if (typeof window !== "undefined") window.dispatchEvent(new Event("vidora:admin-session"));
  },
  clear() {
    token = null; admin = null; csrfToken = null;
    if (typeof window !== "undefined") window.dispatchEvent(new Event("vidora:admin-session"));
  },
  clearLegacyStorage() {
    if (typeof window === "undefined") return false;
    const had = localStorage.getItem("vdr_admin_token") !== null;
    localStorage.removeItem("vdr_admin_token");
    localStorage.removeItem("vdr_admin_user");
    if (had) sessionStorage.setItem("vdr_admin_session_updated", "1");
    return had;
  },
};
const adminChannel = typeof window !== "undefined" && "BroadcastChannel" in window
  ? new BroadcastChannel("vidora-admin-session") : null;
if (adminChannel) adminChannel.onmessage = (event) => {
  if (event.data === "logout") adminTokenStore.clear();
};
const headers = (extra: Record<string, string> = {}) => ({
  "Content-Type": "application/json", "X-API-Key": API_KEY, "X-Session-Mode": "browser", ...extra,
});
async function fetchCsrf(): Promise<string | null> {
  const res = await fetch(`${BASE_URL}/api/admin/auth/browser-csrf`, {
    credentials: "include", headers: headers(),
  });
  if (!res.ok) return null;
  return (await res.json()).data.csrfToken as string;
}
async function performRefresh(): Promise<boolean> {
  let csrf = await fetchCsrf();
  if (!csrf) return false;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${BASE_URL}/api/admin/auth/refresh`, {
      method: "POST", credentials: "include",
      headers: headers({ "X-CSRF-Token": csrf }),
    });
    if (res.ok) {
      const data = (await res.json()).data;
      adminTokenStore.set(data.token, data.admin, data.csrfToken);
      return true;
    }
    if (attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      csrf = await fetchCsrf();
      if (!csrf) return false;
    }
  }
  return false;
}
export async function restoreAdminSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  const run = async (): Promise<boolean> => {
    if (typeof navigator !== "undefined" && navigator.locks?.request) {
      return navigator.locks.request("vidora-admin-refresh", performRefresh);
    }
    return performRefresh();
  };
  refreshPromise = run().finally(() => { refreshPromise = null; });
  return refreshPromise;
}
export async function adminLogout() {
  try {
    csrfToken = await fetchCsrf();
    if (csrfToken) await fetch(`${BASE_URL}/api/admin/auth/logout`, {
      method: "POST", credentials: "include", headers: headers({ "X-CSRF-Token": csrfToken }),
    });
  } finally {
    adminTokenStore.clear();
    adminChannel?.postMessage("logout");
  }
}
export async function adminFetch<T = unknown>(
  path: string, options: RequestInit = {}, retry = true,
): Promise<T> {
  const requestHeaders: Record<string, string> = headers(options.headers as Record<string, string>);
  if (token) requestHeaders.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { ...options, credentials: "include", headers: requestHeaders });
  if (res.status === 401 && retry && !path.includes("/auth/login")) {
    if (await restoreAdminSession()) return adminFetch<T>(path, options, false);
    adminTokenStore.clear();
    throw new Error("Admin session expired.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed." }));
    throw new Error(err.message || "Request failed.");
  }
  return res.json() as Promise<T>;
}
