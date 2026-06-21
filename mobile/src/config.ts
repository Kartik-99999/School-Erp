// Expo inlines EXPO_PUBLIC_* env vars into the bundle at build time. We read them
// directly (rather than via Constants.expoConfig.extra) because the Constants manifest
// can serve a stale value on web.
export const SCHOOL_CODE = process.env.EXPO_PUBLIC_SCHOOL_CODE || "demo";
export const SCHOOL_NAME = process.env.EXPO_PUBLIC_SCHOOL_NAME || "Erpcore School";
export const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000/api/v1";
// DEV ONLY — never set in production.
export const DEV_FAKE_ROLE: string | null = process.env.EXPO_PUBLIC_DEV_FAKE_ROLE || null;
export const DEV_FORCE_2FA = !!process.env.EXPO_PUBLIC_DEV_FORCE_2FA;
