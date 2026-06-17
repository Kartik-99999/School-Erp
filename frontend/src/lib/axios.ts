import axios from "axios";
import { getSession } from "next-auth/react";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

// `getSession()` hits /api/auth/session over the network on every call. Without
// caching, each page-load burst of requests triggers one such round-trip apiece.
// Cache a *valid* token for a short window and de-duplicate concurrent lookups so
// a burst collapses to a single /api/auth/session call. We never cache a null
// (logged-out) result — that would risk briefly locking out a just-logged-in
// user — and we clear the cache on any 401 so auth state can't go stale.
const TOKEN_TTL_MS = 30_000;
let cachedToken: string | null = null;
let cacheExpiry = 0;
let inFlight: Promise<string | null> | null = null;

// Exported so auth transitions (login/logout) can drop a previous user's token
// immediately, rather than relying on the 30s TTL or a full page reload.
export function clearTokenCache() {
  cachedToken = null;
  cacheExpiry = 0;
  inFlight = null;
}

async function resolveToken(): Promise<string | null> {
  if (cachedToken && Date.now() < cacheExpiry) return cachedToken;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const session = await getSession();
      const token = (session as any)?.accessToken ?? null;
      if (token) {
        cachedToken = token;
        cacheExpiry = Date.now() + TOKEN_TTL_MS;
      }
      return token;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

api.interceptors.request.use(
  async (config) => {
    const token = await resolveToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token rejected — drop the cache so the next request re-fetches the session.
      clearTokenCache();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
