import { useEffect, useState, type ReactNode } from 'react';
import {
  FiAlertCircle, FiArrowLeft, FiArrowRight, FiBox, FiCheck,
  FiClock, FiCopy, FiDownload, FiEdit3, FiGlobe, FiLock, FiTrash2,
} from 'react-icons/fi';
import { Link, useNavigate, useParams } from 'react-router';

import SiteHeader from '../components/SiteHeader';
import CommentThread from '../components/CommentThread';
import TeamPanel from '../components/TeamPanel';
import logoSvg from '../../assets/medviz-logo.svg';
import { warmEditorExperience } from './preload';
import { useAuth } from '../features/auth/AuthProvider';
import {
  deleteCase,
  deleteCaseModel,
  getCaseById,
  getCaseModelFileName,
  resolveCaseModelUrl,
  updateCaseVisibility,
  type ClinicalCase,
} from '../features/cases';
import { getSupabaseClient } from '../lib/supabase/client';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

export default function CasePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { caseId = '' } = useParams();
  const [caseRecord, setCaseRecord] = useState<ClinicalCase | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isTogglingShare, setIsTogglingShare] = useState(false);
  const [shareUrlCopied, setShareUrlCopied] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);

  const isOwner = caseRecord?.created_by === user?.id;

  useEffect(() => {
    void warmEditorExperience();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadCase = async () => {
      setIsLoading(true);

      try {
        const record = await getCaseById(caseId);

        if (!record) {
          throw new Error('Clinical case not found.');
        }

        const resolvedDownloadUrl = record.model_url
          ? await resolveCaseModelUrl(record.model_url)
          : null;

        if (isMounted) {
          setCaseRecord(record);
          setShareToken(record.share_token ?? null);
          setDownloadUrl(resolvedDownloadUrl);
          setErrorMessage(null);
          setDeleteError(null);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load the clinical case.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadCase();

    return () => {
      isMounted = false;
    };
  }, [caseId]);

  // Redirect non-owner members if they are removed from this case
  useEffect(() => {
    if (!user || !caseRecord || isOwner) return;

    const client = getSupabaseClient();
    const channel = client
      .channel(`my_membership:${caseId}`)
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'case_members', filter: `case_id=eq.${caseId}` },
        (payload) => {
          if ((payload.old as Record<string, unknown>)?.user_id === user.id) {
            navigate('/dashboard', { replace: true });
          }
        }
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [caseId, user, caseRecord, isOwner, navigate]);

  if (isLoading) {
    return <CasePageSkeleton caseId={caseId} />;
  }

  if (errorMessage || !caseRecord) {
    return (
      <div className="flex min-h-full items-center justify-center px-4">
        <div className="max-w-xl rounded-[30px] border border-rose-500/25 bg-[rgba(15,39,69,0.9)] px-8 py-10 text-center shadow-[0_24px_60px_rgba(3,10,18,0.4)] backdrop-blur">
          <p className="font-display text-sm font-bold uppercase tracking-[0.4em] text-rose-600">Case Error</p>
          <h1 className="mt-4 font-display text-3xl font-bold text-medviz-ink">The case could not be loaded</h1>
          <p className="mt-3 text-sm leading-6 text-white/68">
            {errorMessage || 'The requested clinical case is unavailable.'}
          </p>
          <Link
            to="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-medviz-accent px-5 py-3 text-sm font-semibold text-[#060f1a] transition hover:bg-[#7ad9ff]"
          >
            <FiArrowLeft className="h-4 w-4" />
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const handleDeleteCase = async () => {
    if (!caseRecord || isDeleting) return;

    const shouldDelete = window.confirm(
      `Delete "${caseRecord.title}"? This will remove the case and its saved patient model.`
    );

    if (!shouldDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const modelUrls = [caseRecord.model_url, caseRecord.optimized_model_url].filter(
        (value): value is string => Boolean(value)
      );

      for (const modelUrl of modelUrls) {
        try {
          await deleteCaseModel(modelUrl);
        } catch (storageError) {
          console.warn('Failed to remove a saved case model during delete:', storageError);
        }
      }

      await deleteCase(caseRecord.id);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete the clinical case.');
      setIsDeleting(false);
    }
  };

  const handleToggleShare = async () => {
    if (!caseRecord || isTogglingShare) return;
    setIsTogglingShare(true);
    try {
      const newVisibility = caseRecord.visibility === 'public' ? 'private' : 'public';
      const updated = await updateCaseVisibility(caseRecord.id, newVisibility);
      setCaseRecord(updated);

      if (newVisibility === 'public' && updated.share_token) {
        const url = `${window.location.origin}/share/${updated.share_token}`;
        await navigator.clipboard.writeText(url).catch(() => undefined);
        setShareUrlCopied(true);
        setTimeout(() => setShareUrlCopied(false), 3000);
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to update sharing.');
    } finally {
      setIsTogglingShare(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!caseRecord?.share_token) return;
    const url = `${window.location.origin}/share/${caseRecord.share_token}`;
    await navigator.clipboard.writeText(url).catch(() => undefined);
    setShareUrlCopied(true);
    setTimeout(() => setShareUrlCopied(false), 3000);
  };

  const isPublic = caseRecord.visibility === 'public';

  return (
    <div className="min-h-full bg-transparent">
      <SiteHeader
        actions={[
          { label: 'Case List', to: '/dashboard', variant: 'outline' },
          { label: 'Edit Case', to: `/cases/${caseRecord.id}/edit`, variant: 'outline' },
          {
            label: caseRecord.model_url ? 'Open 3D Review' : 'Add Patient Model',
            to: `/editor?caseId=${caseRecord.id}`,
            variant: 'primary',
          },
        ]}
      />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-[34px] border border-medviz-line/80 bg-[rgba(15,39,69,0.9)] px-6 py-5 shadow-[0_24px_70px_rgba(3,10,18,0.4)] backdrop-blur lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-medviz-line bg-[rgba(9,22,39,0.9)]">
                <img src={logoSvg} alt="MedViz logo" className="h-8 w-8 object-contain" />
              </div>
              <div>
                <p className="font-display text-xs font-bold uppercase tracking-[0.4em] text-medviz-accent">
                  Review Case
                </p>
                <h1 className="mt-2 font-display text-4xl font-bold text-medviz-ink">{caseRecord.title}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68">
                  {caseRecord.description || 'No description was provided for this case yet.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-full border border-medviz-line bg-[rgba(9,22,39,0.85)] px-5 py-3 text-sm font-semibold text-medviz-ink transition hover:border-medviz-accent hover:text-medviz-accent"
              >
                <FiArrowLeft className="h-4 w-4" />
                Case List
              </Link>
              {isOwner && (
                <>
                  <Link
                    to={`/cases/${caseRecord.id}/edit`}
                    className="inline-flex items-center gap-2 rounded-full border border-medviz-line bg-[rgba(9,22,39,0.85)] px-5 py-3 text-sm font-semibold text-medviz-ink transition hover:border-medviz-gold hover:text-medviz-gold"
                  >
                    <FiEdit3 className="h-4 w-4" />
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleDeleteCase()}
                    disabled={isDeleting}
                    className="inline-flex items-center gap-2 rounded-full border border-rose-400/25 bg-[rgba(127,29,29,0.18)] px-5 py-3 text-sm font-semibold text-rose-100 transition hover:border-rose-300 hover:bg-[rgba(127,29,29,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FiTrash2 className="h-4 w-4" />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </>
              )}
              <Link
                to={`/editor?caseId=${caseRecord.id}`}
                onMouseEnter={() => void warmEditorExperience()}
                onFocus={() => void warmEditorExperience()}
                className="inline-flex items-center gap-2 rounded-full bg-medviz-accent px-5 py-3 text-sm font-semibold text-[#060f1a] transition hover:bg-[#7ad9ff]"
              >
                {caseRecord.model_url ? 'Open 3D Review' : 'Add Patient Model'}
                <FiArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </header>

        <main className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[34px] border border-medviz-line/80 bg-[linear-gradient(160deg,rgba(9,22,39,0.98),rgba(15,39,69,0.96))] px-6 py-7 text-white shadow-[0_26px_80px_rgba(3,10,18,0.45)] lg:px-8">
            <p className="font-display text-xs font-bold uppercase tracking-[0.4em] text-white/55">
              Patient Model
            </p>
            <h2 className="mt-4 font-display text-3xl font-bold">
              {caseRecord.model_url ? 'Ready for review' : 'Model not added yet'}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/74">
              {caseRecord.model_url
                ? 'Review the case notes, open the patient model, and continue measuring or annotating findings.'
                : 'Review the notes first, then open 3D review to import the patient model for this case.'}
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <CaseMetric
                icon={<FiLock className="h-4 w-4" />}
                label="Privacy"
                value={isPublic ? 'Public (shared)' : 'Private'}
              />
              <CaseMetric
                icon={<FiClock className="h-4 w-4" />}
                label="Added"
                value={dateFormatter.format(new Date(caseRecord.created_at))}
              />
              <CaseMetric
                icon={<FiBox className="h-4 w-4" />}
                label="Model"
                value={caseRecord.model_url ? getCaseModelFileName(caseRecord.model_url) : 'Not added'}
              />
            </div>

            {deleteError ? (
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            ) : null}
          </section>

          <aside className="space-y-4">
            {/* Case Actions */}
            <div className="rounded-[34px] border border-medviz-line/80 bg-[rgba(15,39,69,0.88)] px-6 py-7 shadow-[0_24px_70px_rgba(3,10,18,0.4)] backdrop-blur">
              <p className="font-display text-xs font-bold uppercase tracking-[0.4em] text-medviz-gold">
                Case Actions
              </p>
              <h2 className="mt-3 font-display text-2xl font-bold text-medviz-ink">
                {caseRecord.model_url ? 'Open or download' : 'Add patient model'}
              </h2>

              <div className="mt-6 rounded-[26px] border border-medviz-line bg-[rgba(9,22,39,0.82)] p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-white/48">Model</div>
                <div className="mt-3 break-all font-medium text-medviz-ink">
                  {caseRecord.model_url ? getCaseModelFileName(caseRecord.model_url) : 'No model added yet'}
                </div>
              </div>

              {downloadUrl ? (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-medviz-line bg-[rgba(9,22,39,0.85)] px-5 py-3 text-sm font-semibold text-medviz-ink transition hover:border-medviz-accent hover:text-medviz-accent"
                >
                  <FiDownload className="h-4 w-4" />
                  Download Model
                </a>
              ) : (
                <Link
                  to={`/editor?caseId=${caseRecord.id}`}
                  onMouseEnter={() => void warmEditorExperience()}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-medviz-line bg-[rgba(9,22,39,0.85)] px-5 py-3 text-sm font-semibold text-medviz-ink transition hover:border-medviz-accent hover:text-medviz-accent"
                >
                  <FiArrowRight className="h-4 w-4" />
                  Add Model in 3D Review
                </Link>
              )}
            </div>

            {/* Share Panel */}
            {isOwner && (
              <div className="rounded-[34px] border border-medviz-line/80 bg-[rgba(15,39,69,0.88)] px-6 py-7 shadow-[0_24px_70px_rgba(3,10,18,0.4)] backdrop-blur">
                <p className="font-display text-xs font-bold uppercase tracking-[0.4em] text-medviz-accent">
                  Sharing
                </p>
                <h2 className="mt-3 font-display text-2xl font-bold text-medviz-ink">
                  {isPublic ? 'Case is public' : 'Case is private'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  {isPublic
                    ? 'Anyone with the link can view this case. Share the link below.'
                    : 'Only you and your team can see this case.'}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => void handleToggleShare()}
                      disabled={isTogglingShare}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
                        isPublic
                          ? 'border border-medviz-line bg-[rgba(9,22,39,0.85)] text-medviz-ink hover:border-rose-400/50 hover:text-rose-300'
                          : 'bg-medviz-accent text-[#060f1a] hover:bg-[#7ad9ff]'
                      }`}
                    >
                      <FiGlobe className="h-4 w-4" />
                      {isTogglingShare
                        ? 'Updating...'
                        : isPublic
                        ? 'Make Private'
                        : 'Make Public & Copy Link'}
                    </button>
                  )}

                  {isPublic && caseRecord.share_token && (
                    <button
                      type="button"
                      onClick={() => void handleCopyShareLink()}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-medviz-line bg-[rgba(9,22,39,0.85)] px-4 py-2.5 text-sm font-semibold text-medviz-ink transition hover:border-medviz-accent hover:text-medviz-accent"
                    >
                      {shareUrlCopied ? (
                        <>
                          <FiCheck className="h-4 w-4 text-medviz-accent" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <FiCopy className="h-4 w-4" />
                          Copy Share Link
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </aside>
        </main>

        {/* Team Panel — owner only */}
        {isOwner && shareToken && (
          <TeamPanel
            caseId={caseRecord.id}
            shareToken={shareToken}
            isOwner={isOwner}
            currentUserId={user?.id ?? ''}
          />
        )}

        {/* Comment Thread */}
        <CommentThread caseId={caseRecord.id} isOwner={isOwner ?? false} />
      </div>
    </div>
  );
}

function CasePageSkeleton({ caseId }: { caseId: string }) {
  return (
    <div className="min-h-full bg-transparent">
      <SiteHeader
        actions={[
          { label: 'Case List', to: '/dashboard', variant: 'outline' },
          { label: 'Open 3D Review', to: `/editor?caseId=${caseId}`, variant: 'primary' },
        ]}
      />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-[34px] border border-medviz-line/80 bg-[rgba(15,39,69,0.9)] px-6 py-5 shadow-[0_24px_70px_rgba(3,10,18,0.4)] backdrop-blur lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-medviz-line bg-[rgba(9,22,39,0.9)]">
                <img src={logoSvg} alt="MedViz logo" className="h-8 w-8 object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="h-3 w-28 animate-pulse rounded-full bg-white/12" />
                <div className="mt-4 h-10 max-w-xl animate-pulse rounded-2xl bg-white/10" />
                <div className="mt-4 h-5 max-w-2xl animate-pulse rounded-full bg-white/8" />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="h-11 w-32 animate-pulse rounded-full bg-white/10" />
              <div className="h-11 w-40 animate-pulse rounded-full bg-medviz-accent/30" />
            </div>
          </div>
        </header>

        <main className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[34px] border border-medviz-line/80 bg-[linear-gradient(160deg,rgba(9,22,39,0.98),rgba(15,39,69,0.96))] px-6 py-7 text-white shadow-[0_26px_80px_rgba(3,10,18,0.45)] lg:px-8">
            <div className="h-3 w-32 animate-pulse rounded-full bg-white/12" />
            <div className="mt-4 h-10 w-72 animate-pulse rounded-2xl bg-white/10" />
            <div className="mt-4 h-5 max-w-2xl animate-pulse rounded-full bg-white/8" />
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-[24px] border border-white/14 bg-white/8 p-4 backdrop-blur-sm">
                  <div className="h-3 w-20 animate-pulse rounded-full bg-white/12" />
                  <div className="mt-4 h-7 w-28 animate-pulse rounded-full bg-white/10" />
                </div>
              ))}
            </div>
          </section>
          <aside className="rounded-[34px] border border-medviz-line/80 bg-[rgba(15,39,69,0.88)] px-6 py-7 shadow-[0_24px_70px_rgba(3,10,18,0.4)] backdrop-blur">
            <div className="h-3 w-24 animate-pulse rounded-full bg-white/12" />
            <div className="mt-4 h-8 w-48 animate-pulse rounded-2xl bg-white/10" />
            <div className="mt-6 h-24 animate-pulse rounded-[26px] border border-medviz-line bg-[rgba(9,22,39,0.82)]" />
            <div className="mt-6 h-11 w-40 animate-pulse rounded-full bg-white/10" />
          </aside>
        </main>
      </div>
    </div>
  );
}

interface CaseMetricProps {
  icon: ReactNode;
  label: string;
  value: string;
}

function CaseMetric({ icon, label, value }: CaseMetricProps) {
  return (
    <div className="rounded-[24px] border border-white/14 bg-white/8 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/58">
        <span className="text-medviz-gold">{icon}</span>
        {label}
      </div>
      <div className="mt-3 font-display text-xl font-bold text-white">{value}</div>
    </div>
  );
}
