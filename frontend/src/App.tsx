import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { OverviewPage } from "./pages/OverviewPage";
import { MetasPerformancePage } from "./pages/MetasPerformancePage";
import { SellersRankingPage } from "./pages/SellersRankingPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/metas" element={<MetasPerformancePage />} />
          <Route path="/ranking" element={<SellersRankingPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
