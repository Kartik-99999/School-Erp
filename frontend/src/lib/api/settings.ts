import api from "../axios";

// Per-school Razorpay config. Secrets are write-only: the GET never returns them (only
// whether they're set); the PUT only overwrites a secret when a non-empty value is sent.
export interface PaymentGatewayStatus {
  enabled: boolean;
  key_id: string | null;
  has_key_secret: boolean;
  has_webhook_secret: boolean;
  configured: boolean;
}

export interface PaymentGatewayUpdate {
  key_id?: string;
  key_secret?: string;
  webhook_secret?: string;
  enabled?: boolean;
}

export const getPaymentGateway = async (): Promise<PaymentGatewayStatus> =>
  (await api.get("/settings/payment-gateway")).data.data;

export const updatePaymentGateway = async (
  payload: PaymentGatewayUpdate
): Promise<PaymentGatewayStatus> =>
  (await api.put("/settings/payment-gateway", payload)).data.data;


// School profile/settings — the editable subset surfaced on the admin Settings page.
export interface MySchool {
  id?: string;
  name?: string;
  logo_url?: string | null;
  address?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  board_affiliation?: string | null;
  grading_system?: string | null;
  whatsapp_enabled?: boolean;
  [k: string]: any;
}

export const getMySchool = async (): Promise<MySchool> =>
  (await api.get("/settings/me")).data.data;

export const updateMySchool = async (payload: Partial<MySchool>): Promise<MySchool> =>
  (await api.put("/settings/me", payload)).data.data;


// Display/redirect fee options (external payment URL + bank transfer). NON-secret —
// returned as-is (unlike the write-only Razorpay payment-gateway endpoint).
export interface FeeOptions {
  external_payment_enabled: boolean;
  external_payment_url: string | null;
  bank_transfer_enabled: boolean;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_branch: string | null;
  bank_account_holder: string | null;
  bank_upi_id: string | null;
}

export const getFeeOptions = async (): Promise<FeeOptions> =>
  (await api.get("/settings/fee-options")).data.data;

export const updateFeeOptions = async (payload: Partial<FeeOptions>): Promise<FeeOptions> =>
  (await api.put("/settings/fee-options", payload)).data.data;
