/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "sonner"
import { MainLayout } from "./layouts/MainLayout"
import { AppList } from "./pages/AppList"
import { AppDetail } from "./pages/AppDetail"
import { FlowCanvas } from "./pages/FlowCanvas"
import { RunHistory } from "./pages/RunHistory"
import { RunDetail } from "./pages/RunDetail"
import { Settings } from "./pages/Settings"
import { DatabaseManager } from "./pages/DatabaseManager"

import { StrategyList } from "./pages/StrategyList"
import { StrategyCreate } from "./pages/StrategyCreate"
import { StrategyDetail } from "./pages/StrategyDetail"

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route path="/" element={<Navigate to="/strategies" replace />} />
        <Route element={<MainLayout />}>
          <Route path="strategies" element={<StrategyList />} />
          <Route path="strategies/new" element={<StrategyCreate />} />
          <Route path="strategies/:strategyId" element={<StrategyDetail />} />
          <Route path="apps" element={<AppList />} />
          <Route path="apps/:appId" element={<AppDetail />} />
          <Route path="apps/:appId/flows/:flowId" element={<FlowCanvas />} />
          <Route path="runs" element={<RunHistory />} />
          <Route path="runs/:runId" element={<RunDetail />} />
          <Route path="database" element={<DatabaseManager />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
