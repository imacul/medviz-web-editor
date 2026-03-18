import { Navigate, Outlet, useLocation } from 'react-router';

import { useAuth } from '../features/auth/AuthProvider';

export default function ProtectedRoute() {
  const { isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-transparent px-4">
        <div className="rounded-[28px] border border-medviz-line bg-[rgba(15,39,69,0.9)] px-8 py-10 text-center shadow-[0_24px_60px_rgba(3,10,18,0.4)] backdrop-blur">
          <p className="font-display text-xs font-bold uppercase tracking-[0.4em] text-medviz-accent">
            MedViz
          </p>
          <h1 className="mt-4 font-display text-3xl font-bold text-medviz-ink">Opening your cases</h1>
        </div>
      </div>
    );
  }

  if (!user) {
    const redirectTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirectTo=${encodeURIComponent(redirectTo)}`} replace />;
  }

  return <Outlet />;
}
