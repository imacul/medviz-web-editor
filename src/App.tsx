import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { FiBox } from 'react-icons/fi';

import ProtectedRoute from './components/ProtectedRoute';
import { loadEditorPage } from './pages/preload';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CreateCasePage = lazy(() => import('./pages/CreateCasePage'));
const EditCasePage = lazy(() => import('./pages/EditCasePage'));
const EditorPage = lazy(loadEditorPage);
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const CasePage = lazy(() => import('./pages/CasePage'));
const LandingPageRoute = lazy(() => import('./pages/LandingPageRoute'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const SharedCasePage = lazy(() => import('./pages/SharedCasePage'));

export default function App() {
  useEffect(() => {
    document.title = 'MedViz';
  }, []);

  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<LandingPageRoute />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/share/:shareToken" element={<SharedCasePage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route
            path="/editor"
            element={
              <Suspense fallback={<EditorRouteFallback />}>
                <EditorPage />
              </Suspense>
            }
          />
          <Route path="/cases/new" element={<CreateCasePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/cases/:caseId/edit" element={<EditCasePage />} />
          <Route path="/cases/:caseId" element={<CasePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function EditorRouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(84,176,255,0.16),transparent_42%),linear-gradient(180deg,#07111d_0%,#091627_48%,#0f2745_100%)] px-4">
      <div className="flex w-full max-w-sm items-center gap-4 rounded-[24px] border border-medviz-line/80 bg-[rgba(9,22,39,0.9)] px-5 py-4 text-left text-white shadow-[0_20px_60px_rgba(3,10,18,0.36)] backdrop-blur">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-medviz-line/70 bg-[rgba(15,39,69,0.88)] text-medviz-accent">
          <FiBox className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-medviz-gold">3D Review</p>
          <p className="mt-1 font-display text-xl font-bold text-medviz-ink">Opening review workspace</p>
          <p className="mt-1 text-sm text-white/62">Preparing the viewer.</p>
        </div>
      </div>
    </div>
  );
}
