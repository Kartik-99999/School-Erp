import axios from "axios";
import { API_URL, SCHOOL_CODE } from "../config";
import { deleteItem, getItem, setItem } from "../lib/storage";

export const SESSION_KEY = "erpcore.session";

// Every request carries the app's school code so the backend can reject foreign accounts.
export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { "X-School-Code": SCHOOL_CODE },
});

export function setAuthToken(token: string | null) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

// AuthContext registers this so a failed refresh can drop React state.
let onSignedOut: () => void = () => {};
export function setSignedOutHandler(fn: () => void) {
  onSignedOut = fn;
}

let refreshing: Promise<string | null> | null = null;
async function refreshAccessToken(): Promise<string | null> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const raw = await getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s?.refresh) return null;
      // Bare axios (no interceptor) so a 401 here can't loop.
      const res = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: s.refresh });
      const token = res.data?.access_token;
      if (!token) return null;
      const updated = { ...s, token, refresh: res.data?.refresh_token ?? s.refresh };
      await setItem(SESSION_KEY, JSON.stringify(updated));
      setAuthToken(token);
      return token;
    } catch {
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

// On a 401, try a one-shot refresh + retry; if that fails, sign out.
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const cfg = error.config || {};
    const status = error.response?.status;
    const url: string = cfg.url || "";
    if (status === 401 && !cfg._retry && !url.includes("/auth/")) {
      cfg._retry = true;
      const token = await refreshAccessToken();
      if (token) {
        cfg.headers = { ...(cfg.headers || {}), Authorization: `Bearer ${token}` };
        return api(cfg);
      }
      await deleteItem(SESSION_KEY);
      setAuthToken(null);
      onSignedOut();
    }
    return Promise.reject(error);
  }
);
