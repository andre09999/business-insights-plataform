import { Outlet } from "react-router-dom";
import { useMemo, useState } from "react";
import { Sidebar } from "./Sidebar";
import { SidebarContext } from "./sidebarContext";

export function AppShell() {
  // ✅ agora funciona em mobile e desktop (push)
  const [open, setOpen] = useState(false); // se quiser iniciar fechado no desktop: false

  const value = useMemo(
    () => ({
      open,
      toggle: () => setOpen((v) => !v),
      close: () => setOpen(false),
    }),
    [open]
  );

  return (
    <SidebarContext.Provider value={value}>
      <div
        className="min-h-screen text-white bg-neutral-950
        [background-image:radial-gradient(1200px_500px_at_20%_0%,rgba(99,102,241,0.18),transparent_60%),radial-gradient(900px_400px_at_90%_10%,rgba(34,211,238,0.12),transparent_55%)]"
      >
        <div className="flex min-h-screen w-full">
          {/* ✅ Sidebar (push) em TODAS as resoluções */}
          <aside
            className={[
              "overflow-hidden transition-[width] duration-200 ease-out",
              open ? "w-[260px]" : "w-0",
            ].join(" ")}
            aria-hidden={!open}
          >
            {open ? <Sidebar onNavigate={() => setOpen(false)} /> : null}
          </aside>

          {/* Conteúdo empurrado automaticamente */}
          <main className="min-w-0 flex-1 w-full">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
