"use client";

import { createContext, useMemo, type ReactNode } from "react";
import { createContextualCan } from "@casl/react";
import { useAbility } from "@casl/react";
import { useAuth } from "../contexts/auth-context";
import { defineAdminAbility, type AppAbility } from "./defineAdminAbility";

export const AbilityContext = createContext<AppAbility>(defineAdminAbility(null));

/** Bound `<Can>` for admin abilities — use `I` + `a` (e.g. `<AdminCan I="read" a="Dashboard" />`). */
export const AdminCan = createContextualCan(AbilityContext.Consumer);

export function AdminAbilityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const ability = useMemo(() => defineAdminAbility(user), [user]);
  return <AbilityContext.Provider value={ability}>{children}</AbilityContext.Provider>;
}

export function useAdminAbility(): AppAbility {
  return useAbility(AbilityContext);
}
