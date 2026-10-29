// Leave empty when the site and API are served together (npm start).
// If the site is hosted separately, set VITE_API_URL to the API server's address.
const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const storage = (kind) => ({
  get: (k) => { try { return window[kind].getItem(k) || ""; } catch { return ""; } },
  set: (k, v) => { try { window[kind].setItem(k, v); } catch { /* private mode */ } },
  remove: (k) => { try { window[kind].removeItem(k); } catch { /* private mode */ } },
});
export const local = storage("localStorage");
export const session = storage("sessionStorage");
const GUEST_KEY = "invite-pass";
export const ADMIN_KEY = "invite-admin";

// the share code from /i/<code> (or ?link=<code>)
export function linkCode() {
  const m = location.pathname.match(/\/i\/([\w-]+)/);
  return m ? m[1] : new URLSearchParams(location.search).get("link") || "";
}

/* -> { status: "ok", invite } | { status: "locked", error } | { status: "missing", error } | { status: "error" } */
export async function loadInvite(password = local.get(GUEST_KEY)) {
  const code = linkCode();
  try {
    const res = await fetch(`${API}/api/invite${code ? `?link=${encodeURIComponent(code)}` : ""}`, {
      cache: "no-store",
      headers: password ? { "X-View-Password": password } : {},
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 429) {
      if (res.status === 401) local.remove(GUEST_KEY);
      return { status: "locked", error: data.error || "" };
    }
    if (!res.ok) return { status: "missing", error: data.error || "This invitation isn't available." };
    if (password) local.set(GUEST_KEY, password);   // remembered on this device
    return { status: "ok", invite: data };
  } catch {
    return { status: "error" };
  }
}

async function adminFetch(path, { method = "GET", body, password = session.get(ADMIN_KEY) } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    cache: "no-store",
    headers: { "X-Admin-Password": password || "", ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const adminStatus = () => adminFetch("/api/admin/status");
export const adminLogin = (password) => adminFetch("/api/admin/login", { method: "POST", password });
export const adminData = () => adminFetch("/api/admin/data");
export const saveInvite = (invite) => adminFetch("/api/invite", { method: "PUT", body: invite });
export const saveAccess = (access) => adminFetch("/api/admin/access", { method: "PUT", body: access });
