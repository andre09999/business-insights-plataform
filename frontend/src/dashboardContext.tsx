/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import { useDashboardData } from "./useDashboardData";

type DashboardState = ReturnType<typeof useDashboardData>;

const DashboardContext = createContext<DashboardState | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const value = useDashboardData();
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const context = useContext(DashboardContext);

  if (!context) {
    throw new Error("useDashboard must be used within DashboardProvider");
  }

  return context;
}
