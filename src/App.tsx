/*
 * SkillMap - 对话驱动的技能探索地图
 * © 2026 SkillMap 团队
 * 版权所有，未经授权不得用于商业用途
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DevToolsPanel from './components/Debug/DevToolsPanel';
import React, { lazy, Suspense, useState } from 'react';

const GeneratePage = lazy(() => import('./pages/GeneratePage'));
const TreePage = lazy(() => import('./pages/TreePage'));
const TimelinePage = lazy(() => import('./pages/TimelinePage'));
const TestPage = lazy(() => import('./pages/TestPage'));

const PageLoader = () => (
  <div className="min-h-screen bg-light-bg flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-skill-core border-t-transparent rounded-full animate-spin" />
  </div>
);

function AppRoutes() {
  const { state, dispatch } = useAppContext();
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={
            state.auth.token ? <Navigate to="/tree" replace /> : <LoginPage onLogin={(token, user) => {
              dispatch({ type: 'SET_AUTH', payload: { token, user } });
            }} />}
          />
          <Route path="/" element={<HomePage />} />
          <Route path="/generate" element={<GeneratePage />} />
          <Route path="/tree" element={<TreePage />} />
          <Route path="/tree/timeline" element={<TimelinePage />} />
          <Route path="/tree/:treeId" element={<TreePage />} />
          <Route path="/test" element={<TestPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <DevToolsPanel isOpen={isDevToolsOpen} onClose={() => setIsDevToolsOpen(false)} />
      {(() => {
        (window as any).__toggleDevTools = () => setIsDevToolsOpen((v: boolean) => !v);
        return null;
      })()}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}
