// Helpers for reading the error that NextAuth's Credentials flow surfaces.
//
// `signIn(..., { redirect: false })` resolves with `{ error }`, while the manual
// `/api/auth/callback/credentials` POST (used on tenant subdomains) returns `{ url }`
// with the error encoded as a query param. We normalize both, plus translate our
// 2FA sentinels into friendly copy.

export const TWO_FACTOR_REQUIRED = "2FA_REQUIRED";
export const INVALID_2FA = "INVALID_2FA";

export function parseAuthError(result: any): string | undefined {
  if (!result) return undefined;
  if (result.error) return String(result.error);
  const url: string | undefined = result.url;
  if (url && url.includes("error=")) {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
      return new URL(url, origin).searchParams.get("error") || undefined;
    } catch {
      /* ignore malformed url */
    }
  }
  return undefined;
}

export function prettyAuthError(code?: string): string {
  switch (code) {
    case TWO_FACTOR_REQUIRED:
      return ""; // handled by the UI as a step change, not an error
    case INVALID_2FA:
      return "That code didn't work. Enter a fresh authenticator code or a recovery code.";
    case "CredentialsSignin":
      return "Incorrect email or password.";
    case undefined:
    case "":
      return "Something went wrong. Please try again.";
    default:
      return code;
  }
}
