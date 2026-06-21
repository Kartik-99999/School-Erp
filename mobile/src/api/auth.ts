import { api } from "./client";
import { DEV_FORCE_2FA, SCHOOL_CODE } from "../config";

export interface SchoolBrand {
  id?: string;
  name?: string;
  logo_url?: string | null;
  subdomain?: string;
}
export async function lookupSchool(code: string = SCHOOL_CODE): Promise<SchoolBrand | null> {
  try {
    const res = await api.get(`/schools/lookup/${code}`);
    return (res.data?.data ?? res.data) as SchoolBrand;
  } catch {
    return null;
  }
}

export interface LoginResponse {
  access_token?: string;
  refresh_token?: string;
  role?: string;
  school_id?: string | null;
  subdomain?: string | null;
  user_id?: string;
  requires_2fa?: boolean;
  mfa_token?: string;
  token_type?: string;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  if (DEV_FORCE_2FA) return { requires_2fa: true, mfa_token: "dev-mfa", token_type: "mfa" };
  const body = new URLSearchParams({ username: username.trim(), password });
  const res = await api.post("/auth/login", body.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return res.data as LoginResponse;
}

export async function verify2fa(mfaToken: string, code: string): Promise<LoginResponse> {
  if (DEV_FORCE_2FA) {
    return { access_token: "dev", refresh_token: "dev", role: "Student", school_id: "dev", subdomain: SCHOOL_CODE, user_id: "dev-00000000" };
  }
  const res = await api.post("/auth/2fa/verify", { mfa_token: mfaToken, code: code.trim() });
  return res.data as LoginResponse;
}
