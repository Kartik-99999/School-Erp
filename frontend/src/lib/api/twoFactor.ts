import api from "../axios";

export interface TwoFactorStatus {
  enabled: boolean;
  pending: boolean;
  recovery_codes_remaining: number;
}

export interface TwoFactorSetup {
  secret: string;
  provisioning_uri: string;
  issuer: string;
  account_name: string;
}

export interface TwoFactorEnableResult {
  enabled: boolean;
  recovery_codes: string[];
}

// The 2FA endpoints return their schema directly (not wrapped in {success, data}).
export const getTwoFactorStatus = async (): Promise<TwoFactorStatus> =>
  (await api.get<TwoFactorStatus>("/auth/2fa/status")).data;

export const setupTwoFactor = async (): Promise<TwoFactorSetup> =>
  (await api.post<TwoFactorSetup>("/auth/2fa/setup")).data;

export const enableTwoFactor = async (code: string): Promise<TwoFactorEnableResult> =>
  (await api.post<TwoFactorEnableResult>("/auth/2fa/enable", { code })).data;

export const disableTwoFactor = async (
  password: string
): Promise<{ success: boolean; message: string }> =>
  (await api.post("/auth/2fa/disable", { password })).data;
