import { useEffect, useState } from 'react';
import { FiArrowRight, FiBox, FiClock, FiLock } from 'react-icons/fi';
import { Link, useParams } from 'react-router';

import logoSvg from '../../assets/medviz-logo.svg';
import { useAuth } from '../features/auth/AuthProvider';
import { getCaseByShareToken, getCaseModelFileName, type ClinicalCase } from '../features/cases';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

export default function SharedCasePage() {
  const { shareToken = '' } = useParams();
  const { user } = useAuth();
  const [caseRecord, setCaseRecord] = useState<ClinicalCase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'MedViz — Shared Case';
    document.body.classList.remove('editor-mode');
  }, []);

  useEffect(() => {
    let isMounted = true;

    getCaseByShareToken(shareToken)
      .then((record) => {
        if (isMounted) {
          setCaseRecord(record);
          if (record) {
            document.title = `MedViz — ${record.title}`;
          }
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load the shared case.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [shareToken]);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(15,39,69,0.9)_0%,rgba(3,10,18,0.98)_65%)] px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mx-auto flex max-w-4xl items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={logoSvg} alt="MedViz" className="h-8 w-8 object-contain" />
          <span className="font-display text-lg font-bold text-medviz-ink">MedViz</span>
        </Link>
        {user ? (
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-medviz-line bg-[rgba(9,22,39,0.85)] px-4 py-2 text-sm font-semibold text-medviz-ink transition hover:border-medviz-accent hover:text-medviz-accent"
          >
            My Cases
          </Link>
        ) : (
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-full bg-medviz-accent px-4 py-2 text-sm font-semibold text-[#060f1a] transition hover:bg-[#7ad9ff]"
          >
            Sign In
          </Link>
        )}
      </header>

      <main className="mx-auto mt-10 max-w-4xl">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-64 animate-pulse rounded-[34px] border border-medviz-line bg-[rgba(15,39,69,0.9)]" />
            <div className="h-40 animate-pulse rounded-[34px] border border-medviz-line bg-[rgba(15,39,69,0.88)]" />
          </div>
        ) : error || !caseRecord ? (
          <div className="rounded-[34px] border border-rose-500/25 bg-[rgba(15,39,69,0.9)] px-8 py-12 text-center shadow-[0_24px_60px_rgba(3,10,18,0.4)] backdrop-blur">
            {!user && !error ? (
              <>
                <p className="font-display text-sm font-bold uppercase tracking-[0.4em] text-medviz-accent">
                  Sign in required
                </p>
                <h1 className="mt-4 font-display text-3xl font-bold text-medviz-ink">
                  Sign in to view this case
                </h1>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/65">
                  This case is private. Sign in to your MedViz account to access it.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 rounded-full bg-medviz-accent px-5 py-3 text-sm font-semibold text-[#060f1a] transition hover:bg-[#7ad9ff]"
                  >
                    Sign In
                    <FiArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/signup"
                    className="inline-flex items-center gap-2 rounded-full border border-medviz-line bg-transparent px-5 py-3 text-sm font-semibold text-medviz-ink transition hover:border-medviz-accent hover:text-medviz-accent"
                  >
                    Create Account
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="font-display text-sm font-bold uppercase tracking-[0.4em] text-rose-500">
                  Unavailable
                </p>
                <h1 className="mt-4 font-display text-3xl font-bold text-medviz-ink">
                  This case is not available
                </h1>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/65">
                  {error ?? 'This link is no longer valid or the case has been made private.'}
                </p>
                <Link
                  to={user ? '/dashboard' : '/'}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-medviz-accent px-5 py-3 text-sm font-semibold text-[#060f1a] transition hover:bg-[#7ad9ff]"
                >
                  {user ? 'Go to Dashboard' : 'Go to MedViz'}
                </Link>
              </>
            )}
          </div>
        ) : caseRecord ? (
          <>
            <div className="rounded-[34px] border border-medviz-line/80 bg-[rgba(15,39,69,0.9)] px-6 py-7 shadow-[0_24px_70px_rgba(3,10,18,0.4)] backdrop-blur lg:px-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-medviz-line bg-[rgba(9,22,39,0.9)] px-3 py-1 text-[11px] font-semibold text-medviz-ink/80">
                <FiLock className="h-3.5 w-3.5 text-medviz-accent" />
                Shared Case
              </span>
              <h1 className="mt-4 font-display text-4xl font-bold text-medviz-ink">
                {caseRecord.title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68">
                {caseRecord.description || 'No description provided for this case.'}
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <MetricCard
                  icon={<FiClock className="h-4 w-4" />}
                  label="Created"
                  value={dateFormatter.format(new Date(caseRecord.created_at))}
                />
                <MetricCard
                  icon={<FiBox className="h-4 w-4" />}
                  label="Model"
                  value={
                    caseRecord.model_url
                      ? getCaseModelFileName(caseRecord.model_url)
                      : 'No model attached'
                  }
                />
                <MetricCard
                  icon={<FiLock className="h-4 w-4" />}
                  label="Visibility"
                  value="Public (shared)"
                />
              </div>
            </div>

            <div className="mt-6 rounded-[34px] border border-medviz-line/80 bg-[linear-gradient(160deg,rgba(9,22,39,0.98),rgba(15,39,69,0.96))] px-6 py-7 text-white shadow-[0_26px_80px_rgba(3,10,18,0.45)] lg:px-8">
              {user ? (
                <>
                  <p className="font-display text-xs font-bold uppercase tracking-[0.4em] text-medviz-gold">
                    You're signed in
                  </p>
                  <h2 className="mt-3 font-display text-3xl font-bold">Open in 3D review</h2>
                  <p className="mt-3 text-sm leading-7 text-white/72">
                    You have a MedViz account. Open this case in the 3D editor to measure anatomy,
                    annotate findings, and review the model.
                  </p>
                  <Link
                    to={`/editor?caseId=${caseRecord.id}`}
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-medviz-accent px-5 py-3 text-sm font-semibold text-[#060f1a] transition hover:bg-[#7ad9ff]"
                  >
                    Open in 3D Review
                    <FiArrowRight className="h-4 w-4" />
                  </Link>
                </>
              ) : (
                <>
                  <p className="font-display text-xs font-bold uppercase tracking-[0.4em] text-medviz-gold">
                    Review this case
                  </p>
                  <h2 className="mt-3 font-display text-3xl font-bold">Sign in to open</h2>
                  <p className="mt-3 text-sm leading-7 text-white/72">
                    Sign in to your MedViz account to open this case in 3D review, measure anatomy,
                    and annotate findings.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-2 rounded-full bg-medviz-accent px-5 py-3 text-sm font-semibold text-[#060f1a] transition hover:bg-[#7ad9ff]"
                    >
                      Sign In
                      <FiArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      to="/signup"
                      className="inline-flex items-center gap-2 rounded-full border border-medviz-line bg-transparent px-5 py-3 text-sm font-semibold text-medviz-ink transition hover:border-medviz-accent hover:text-medviz-accent"
                    >
                      Create Account
                    </Link>
                  </div>
                </>
              )}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/12 bg-white/6 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
        <span className="text-medviz-gold">{icon}</span>
        {label}
      </div>
      <div className="mt-3 font-display text-lg font-bold text-white">{value}</div>
    </div>
  );
}
