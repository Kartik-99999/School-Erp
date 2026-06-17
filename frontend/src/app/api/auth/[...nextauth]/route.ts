import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "jsmith@school.edu" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";
          const res = await fetch(`${apiUrl}/auth/login`, {
            method: "POST",
            body: new URLSearchParams({
              username: credentials.email,
              password: credentials.password,
            }),
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            console.error("Backend login failed:", res.status, errData);
            throw new Error(errData.detail || `Backend returned ${res.status}`);
          }

          const user = await res.json();

          if (user && user.access_token) {
            return {
              id: user.user_id,
              email: credentials.email,
              role: user.role,
              school_id: user.school_id,
              subdomain: user.subdomain,
              accessToken: user.access_token,
            };
          }
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
        // Omitting domain on localhost completely so Chrome treats it as a host-only cookie.
        // For production, we use '.educore.com' to allow subdomains to share the cookie.
        domain: process.env.NODE_ENV === "production" ? ".educore.com" : undefined,
      },
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 24 * 60 * 60, // 8 days
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id; // Ensure ID is saved in token
        token.role = user.role;
        token.school_id = user.school_id;
        token.subdomain = user.subdomain;
        token.accessToken = user.accessToken;
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
