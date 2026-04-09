import { FiLock } from 'react-icons/fi';
import { Link, Outlet } from 'react-router';

import { useAuth } from '../features/auth/AuthProvider';
import { useOpsAccess } from '../features/ops/useOpsAccess';

export default function OpsAccessRoute() {
  const { user } = useAuth();
  const { hasAccess, isLoading, error } = useOpsAccess();

  if (isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-transparent px-4">
        <div className="rounded-[28px] border border-medviz-line bg-[rgba(15,39,69,0.9)] px-8 py-10 text-center shadow-[0_24px_60px_rgba(3,10,18,0.4)] backdrop-blur">
          <p className="font-display text-xs font-bold uppercase tracking-[0.4em] text-medviz-accent">
            MedViz
          </p>
          <h1 className="mt-4 font-display text-3xl font-bold text-medviz-ink">
            Verifying ops access
          </h1>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="mx-auto flex min-h-full max-w-3xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <section className="w-full rounded-[34px] border border-medviz-line/80 bg-[rgba(15,39,69,0.9)] px-6 py-7 text-white shadow-[0_24px_70px_rgba(3,10,18,0.4)] backdrop-blur lg:px-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-medviz-line bg-[rgba(9,22,39,0.9)] text-medviz-accent">
            <FiLock className="h-5 w-5" />
          </div>
          <p className="mt-5 font-display text-xs font-bold uppercase tracking-[0.4em] text-medviz-gold">
            Ops Access Required
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold text-medviz-ink">
            This page is not visible to every signed-in user.
          </h1>
          <p className="mt-4 text-sm leading-7 text-white/72">
            The MedViz ops console is restricted to explicitly approved operators. Sign in with an
            allowlisted email or add this account to <span className="font-mono">ops_admins</span>.
          </p>
          {user?.email ? (
            <p className="mt-3 text-sm text-white/56">
              Current account: <span className="font-semibold text-medviz-ink">{user.email}</span>
            </p>
          ) : null}
          {error ? (
            <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-100/8 px-4 py-3 text-sm text-amber-100">
              {error}
            </div>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center rounded-full bg-medviz-accent px-5 py-3 text-sm font-semibold text-[#060f1a] transition hover:bg-[#7ad9ff]"
            >
              Back to Case List
            </Link>
            <Link
              to="/settings"
              className="inline-flex items-center justify-center rounded-full border border-medviz-line bg-[rgba(9,22,39,0.9)] px-5 py-3 text-sm font-semibold text-medviz-ink transition hover:border-medviz-accent hover:text-medviz-accent"
            >
              Settings
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return <Outlet />;
}
