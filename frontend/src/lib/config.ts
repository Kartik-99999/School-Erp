// Platform base domain. Tenants live on subdomains (e.g. <school>.erpcore.tech). Baked at
// build time from NEXT_PUBLIC_BASE_DOMAIN; falls back to erpcore.tech so dev + display render.
export const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || "erpcore.tech";
