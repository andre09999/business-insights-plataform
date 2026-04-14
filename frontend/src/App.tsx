import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DashboardProvider } from "./dashboardContext";
import { AppShell } from "./layout/AppShell";

const OverviewPage = lazy(async () => {
  const module = await import("./pages/OverviewPage");
  return { default: module.OverviewPage };
});

const MetasPerformancePage = lazy(async () => {
  const module = await import("./pages/MetasPerformancePage");
  return { default: module.MetasPerformancePage };
});

const SellersRankingPage = lazy(async () => {
  const module = await import("./pages/SellersRankingPage");
  return { default: module.SellersRankingPage };
});

function PageFallback() {
  return <div className="px-4 py-6 text-sm text-white/70">Carregando pagina...</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <DashboardProvider>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/metas" element={<MetasPerformancePage />} />
              <Route path="/ranking" element={<SellersRankingPage />} />
            </Route>
          </Routes>
        </Suspense>
      </DashboardProvider>
    </BrowserRouter>
  );
}
