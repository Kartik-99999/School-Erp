// Platform base domain. Tenants live on subdomains (e.g. <school>.erpcore.tech). Baked at
// build time from NEXT_PUBLIC_BASE_DOMAIN; falls back to erpcore.tech so dev + display render.
export const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || "erpcore.tech";

/**
 * The tenant (school) subdomain for a request host, or null when the host is the
 * platform itself. Only `<school>.<BASE_DOMAIN>` (or `<school>.localhost` in dev)
 * is a tenant; the base domain, `www`, bare localhost/IPs and any other domain
 * (e.g. a `*.vercel.app` deployment URL) are the platform and get the landing page.
 */
export function getTenantSubdomain(host: string): string | null {
  const hostname = host.split(":")[0].toLowerCase();
  for (const root of [BASE_DOMAIN.toLowerCase(), "localhost"]) {
    if (hostname.endsWith(`.${root}`)) {
      const sub = hostname.slice(0, -(root.length + 1)).split(".")[0];
      return sub && sub !== "www" ? sub : null;
    }
  }
  return null;
}
