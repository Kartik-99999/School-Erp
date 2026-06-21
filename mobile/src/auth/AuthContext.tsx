import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { SESSION_KEY, setAuthToken, setSignedOutHandler } from "../api/client";
import { login as apiLogin, verify2fa as apiVerify2fa, LoginResponse } from "../api/auth";
import { DEV_FAKE_ROLE, SCHOOL_CODE, SCHOOL_NAME } from "../config";
import { deleteItem, getItem, setItem } from "../lib/storage";

export interface Session {
  token: string;
  refresh?: string;
  role: string;
  subdomain: string | null;
  userId: string;
}

interface AuthState {
  restoring: boolean;
  session: Session | null;
  signIn: (username: string, password: string) => Promise<{ twoFactor: string | null }>;
  verifyTwoFactor: (mfaToken: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState>(null as any);
export const useAuth = () => useContext(Ctx);

// Raised when a valid account belongs to a different school than this locked app.
export class WrongSchoolError extends Error {}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [restoring, setRestoring] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  // Turn a successful login/2FA response into a stored, school-checked session.
  const finalize = useCallback(async (data: LoginResponse) => {
    if (!data.access_token) throw new Error("Sign-in failed. Please try again.");
    if ((data.subdomain || null) !== SCHOOL_CODE) {
      throw new WrongSchoolError(
        `This app is for ${SCHOOL_NAME} only. That account belongs to a different school.`
      );
    }
    const s: Session = {
      token: data.access_token,
      refresh: data.refresh_token,
      role: data.role || "Student",
      subdomain: data.subdomain || null,
      userId: data.user_id || "",
    };
    await setItem(SESSION_KEY, JSON.stringify(s));
    setAuthToken(s.token);
    setSession(s);
  }, []);

  useEffect(() => {
    // A failed token-refresh in the api client drops us back to the login screen.
    setSignedOutHandler(() => setSession(null));
  }, []);

  useEffect(() => {
    (async () => {
      if (DEV_FAKE_ROLE) {
        setSession({ token: "dev", role: DEV_FAKE_ROLE, subdomain: SCHOOL_CODE, userId: "dev-00000000" });
        setRestoring(false);
        return;
      }
      try {
        const raw = await getItem(SESSION_KEY);
        if (raw) {
          const s = JSON.parse(raw) as Session;
          if (s.subdomain === SCHOOL_CODE) {
            setAuthToken(s.token);
            setSession(s);
          } else {
            await deleteItem(SESSION_KEY);
          }
        }
      } catch {
        // ignore corrupt session
      } finally {
        setRestoring(false);
      }
    })();
  }, []);

  const signIn = useCallback(
    async (username: string, password: string) => {
      const data = await apiLogin(username, password);
      if (data.requires_2fa && data.mfa_token) return { twoFactor: data.mfa_token };
      await finalize(data);
      return { twoFactor: null };
    },
    [finalize]
  );

  const verifyTwoFactor = useCallback(
    async (mfaToken: string, code: string) => {
      const data = await apiVerify2fa(mfaToken, code);
      await finalize(data);
    },
    [finalize]
  );

  const signOut = useCallback(async () => {
    await deleteItem(SESSION_KEY);
    setAuthToken(null);
    setSession(null);
  }, []);

  return (
    <Ctx.Provider value={{ restoring, session, signIn, verifyTwoFactor, signOut }}>
      {children}
    </Ctx.Provider>
  );
}
