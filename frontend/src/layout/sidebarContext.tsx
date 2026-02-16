import { createContext, useContext } from "react";

export type SidebarCtx = {
  open: boolean;
  toggle: () => void;
  close: () => void;
};

export const SidebarContext = createContext<SidebarCtx | null>(null);

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarContext.Provider");
  return ctx;
}
