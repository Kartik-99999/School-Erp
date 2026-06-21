import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { Child, getMyChildren } from "../api/children";

interface ChildState {
  children: Child[];
  selected: Child | null;
  select: (id: string) => void;
  loading: boolean;
}
const Ctx = createContext<ChildState>({ children: [], selected: null, select: () => {}, loading: false });
export const useChild = () => useContext(Ctx);

export function ChildProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [list, setList] = useState<Child[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (session?.role === "Parent") {
        setLoading(true);
        try {
          const c = await getMyChildren();
          if (!active) return;
          setList(c);
          setSelectedId((prev) => prev ?? c[0]?.id ?? null);
        } catch {
          if (active) setList([]);
        } finally {
          if (active) setLoading(false);
        }
      } else {
        setList([]);
        setSelectedId(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [session?.role]);

  const selected = list.find((c) => c.id === selectedId) ?? null;
  return (
    <Ctx.Provider value={{ children: list, selected, select: setSelectedId, loading }}>
      {children}
    </Ctx.Provider>
  );
}
