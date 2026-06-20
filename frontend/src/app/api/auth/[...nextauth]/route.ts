import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

// Exchange the stored refresh token for a fresh access token (backend rotates the
// refresh token on every call). On failure the token is flagged so the session can
// surface an error and the user is sent back to /login on the next 401.
async function refreshAccessToken(token: any) {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: token.refreshToken }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || `refresh failed (${res.status})`);
    return {
      ...token,
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? token.refreshToken,
      accessTokenExpires: Date.now() + (data.expires_in ?? 3600) * 1000,
      role: data.role ?? token.role,
      school_id: data.school_id ?? token.school_id,
      subdomain: data.subdomain ?? token.subdomain,
      error: undefined,
    };
  } catch (err) {
    console.error("Token refresh failed:", err);
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "jsmith@school.edu" },
        password: { label: "Password", type: "password" },
        otp: { label: "2FA code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const otp = (credentials as any).otp as string | undefined;

        const toUser = (data: any) => ({
          id: data.user_id,
          email: credentials.email,
          role: data.role,
          school_id: data.school_id,
          subdomain: data.subdomain,
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresIn: data.expires_in,
        });

        try {
          const res = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            body: new URLSearchParams({
              username: credentials.email,
              password: credentials.password,
            }),
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          });
          const data = await res.json().catch(() => ({}));

          if (!res.ok) {
            console.error("Backend login failed:", res.status, data);
            throw new Error(data.detail || `Backend returned ${res.status}`);
          }

          // Account has 2FA enabled: don't establish a session until a code is
          // verified. The short-lived mfa_token stays server-side here; the client
          // just re-submits email+password+otp, and we re-derive it.
          if (data.requires_2fa) {
            if (!otp) throw new Error("2FA_REQUIRED");
            const vres = await fetch(`${API_URL}/auth/2fa/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mfa_token: data.mfa_token, code: otp }),
            });
            const vdata = await vres.json().catch(() => ({}));
            if (!vres.ok || !vdata.access_token) throw new Error("INVALID_2FA");
            return toUser(vdata);
          }

          if (data.access_token) return toUser(data);
          throw new Error("Invalid response format from backend");
        } catch (error: any) {
          console.error("Auth error:", error.message);
          throw new Error(error.message || "Failed to connect to backend");
        }
      },
    }),
  ],
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        // In production, share the session cookie across subdomains via
        // `.${NEXT_PUBLIC_BASE_DOMAIN}` (e.g. .erpcore.tech); host-only on localhost.
        domain:
          process.env.NODE_ENV === "production"
            ? `.${process.env.NEXT_PUBLIC_BASE_DOMAIN || "erpcore.tech"}`
            : undefined,
      },
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 24 * 60 * 60, // 8 days (refresh token lifetime; access token is short-lived)
  },
  callbacks: {
    async jwt({ token, user }: any) {
      // Initial sign-in: persist tokens + the access-token expiry.
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.school_id = user.school_id;
        token.subdomain = user.subdomain;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.accessTokenExpires = Date.now() + (user.expiresIn ?? 3600) * 1000;
        return token;
      }
      // Access token still valid (60s clock skew) -> use as-is.
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires - 60_000) {
        return token;
      }
      // Expired -> rotate via the backend refresh token.
      if (token.refreshToken) {
        return await refreshAccessToken(token);
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token) {
        // @ts-ignore
        session.user.id = token.id || token.sub; // Ensure ID is passed to session
        // @ts-ignore
        session.user.role = token.role;
        // @ts-ignore
        session.user.school_id = token.school_id;
        // @ts-ignore
        session.user.subdomain = token.subdomain;
        // @ts-ignore
        session.accessToken = token.accessToken;
        // @ts-ignore
        session.error = token.error;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};

const handler = async (req: Request, ctx: any) => {
  delete process.env.NEXTAUTH_URL;
  const authHandler = NextAuth(authOptions);
  return authHandler(req, ctx);
};

export { handler as GET, handler as POST };
