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
