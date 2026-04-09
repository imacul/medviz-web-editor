import { useEffect, useMemo, useState } from 'react';
import { FiArrowRight, FiBox, FiClock, FiEdit3, FiFolder, FiHardDrive, FiLock, FiPlus, FiSettings, FiTrash2 } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router';

import SiteHeader from '../components/SiteHeader';
import logoSvg from '../../assets/medviz-logo.svg';
import {
  deleteCase,
  deleteCaseModel,
  getCaseModelFileName,
  isLocalCaseId,
  deleteLocalCase,
  listLocalCases,
  listCasesForUser,
  listMemberCases,
  toLocalClinicalCase,
  type ClinicalCase,
} from '../features/cases';
import { getSupabaseClient } from '../lib/supabase/client';
import { warmEditorExperience } from './preload';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export default function DashboardPage() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<ClinicalCase[]>([]);
  const [memberCaseIds, setMemberCaseIds] = useState<Set<string>>(new Set());
  const [isLoadingCases, setIsLoadingCases] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deletingCaseId, setDeletingCaseId] = useState<string | null>(null);

  useEffect(() => {
    void warmEditorExperience();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadCases = async () => {
      setIsLoadingCases(true);
      try {
        const [cloudData, memberData, localData] = await Promise.all([
          listCasesForUser({ limit: 8 }),
          listMemberCases(),
          Promise.resolve(listLocalCases().map(toLocalClinicalCase)),
        ]);
        if (isMounted) {
          // Deduplicate: owned cases take precedence over member cases
          const ownedIds = new Set(cloudData.map((c) => c.id));
          const uniqueMemberCases = memberData.filter((c) => !ownedIds.has(c.id));
          setMemberCaseIds(new Set(uniqueMemberCases.map((c) => c.id)));
          const merged = [...cloudData, ...uniqueMemberCases, ...localData].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setCases(merged);
          setErrorMessage(null);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load cases.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingCases(false);
        }
      }
    };

    void loadCases();

    return () => {
      isMounted = false;
    };
  }, []);

  const summary = useMemo(
    () => [
      {
        label: 'Cases',
        value: cases.length.toString().padStart(2, '0'),
        detail: 'Saved for review',
      },
      {
        label: 'Models',
        value: cases.filter((caseItem) => Boolean(caseItem.model_url)).length.toString().padStart(2, '0'),
        detail: 'Added to review',
      },
      {
        label: 'Privacy',
        value: 'Private',
        detail: 'Visible only to you',
      },
    ],
    [cases.length]
  );

  const handleSignOut = async () => {
    await getSupabaseClient().auth.signOut();
    navigate('/', { replace: true });
  };

  const handleDeleteCase = async (caseItem: ClinicalCase) => {
    if (deletingCaseId) {
      return;
    }

    const isLocal = isLocalCaseId(caseItem.id);
    const shouldDelete = window.confirm(
      `Delete "${caseItem.title}"? This will remove the case${isLocal ? ' from this browser' : ' and any saved patient model'}.`
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingCaseId(caseItem.id);
    setErrorMessage(null);

    try {
      if (isLocal) {
        deleteLocalCase(caseItem.id);
      } else {
        const modelUrls = [caseItem.model_url, caseItem.optimized_model_url].filter(
          (value): value is string => Boolean(value)
        );

        for (const modelUrl of modelUrls) {
          try {
            await deleteCaseModel(modelUrl);
          } catch (storageError) {
            console.warn('Failed to remove a saved case model during delete:', storageError);
          }
        }

        await deleteCase(caseItem.id);
      }
      setCases((currentCases) => currentCases.filter((currentCase) => currentCase.id !== caseItem.id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete the clinical case.');
    } finally {
      setDeletingCaseId(null);
    }
  };

  return (
    <>
      <div className="min-h-full bg-transparent">
        <SiteHeader
          actions={[
            { label: 'New Case', to: '/cases/new', variant: 'primary' },
            { label: 'Settings', to: '/settings', variant: 'outline' },
            { label: 'Sign Out', onClick: handleSignOut, variant: 'outline' },
          ]}
        />

        <div className="mx-auto flex min-h-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          <header className="rounded-[32px] border border-medviz-line/80 bg-[rgba(15,39,69,0.9)] px-6 py-5 shadow-[0_18px_70px_rgba(3,10,18,0.42)] backdrop-blur lg:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-medviz-line bg-[rgba(9,22,39,0.9)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <img src={logoSvg} alt="MedViz logo" className="h-8 w-8 object-contain" />
                </div>
                <div>
                  <p className="font-display text-xs font-bold uppercase tracking-[0.4em] text-medviz-accent">
                    Review Cases
                  </p>
                  <h1 className="font-display text-3xl font-bold tracking-tight text-medviz-ink">
                    Case List
                  </h1>
                  <p className="mt-1 text-sm text-white/60">Private workspace</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/cases/new')}
                  className="inline-flex items-center gap-2 rounded-full bg-medviz-accent px-5 py-3 text-sm font-semibold text-[#060f1a] transition hover:bg-[#7ad9ff]"
                >
                  <FiPlus className="h-4 w-4" />
                  New Case
                </button>
              </div>
            </div>
          </header>

          <main className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="overflow-hidden rounded-[36px] border border-medviz-line/80 bg-[linear-gradient(145deg,rgba(9,22,39,0.98),rgba(15,39,69,0.95))] px-6 py-7 text-white shadow-[0_30px_80px_rgba(3,10,18,0.45)] lg:px-8 lg:py-8">
              <div className="max-w-2xl">
                <p className="font-display text-xs font-bold uppercase tracking-[0.45em] text-white/60">
                  Case Review
                </p>
                <h2 className="mt-4 font-display text-4xl font-bold tracking-tight">
                  Open a case and continue the review when you are ready.
                </h2>
                <p className="mt-4 max-w-xl text-base leading-7 text-white/78">
                  View patient models, measure anatomy, and return to saved findings without starting again.
                </p>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {summary.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[24px] border border-white/15 bg-white/8 p-4 backdrop-blur-sm"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">
                      {item.label}
                    </p>
                    <div className="mt-3 font-display text-4xl font-bold">{item.value}</div>
                    <p className="mt-2 text-sm leading-6 text-white/72">{item.detail}</p>
                  </div>
                ))}
              </div>
            </section>

            <aside className="rounded-[36px] border border-medviz-line/80 bg-[rgba(15,39,69,0.88)] px-6 py-7 shadow-[0_24px_70px_rgba(3,10,18,0.4)] backdrop-blur">
              <p className="font-display text-xs font-bold uppercase tracking-[0.4em] text-medviz-gold">
                Review Tasks
              </p>
              <h2 className="mt-3 font-display text-2xl font-bold text-medviz-ink">What you can do here</h2>
              <ul className="mt-5 space-y-4 text-sm leading-6 text-medviz-ink/72">
                <li className="flex gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-medviz-accent" />
                  Review case notes before opening the patient model.
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-medviz-gold" />
                  Create the case first, then add the STL, OBJ, or PLY file inside 3D review.
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-medviz-accent" />
                  Open any saved case to measure anatomy or annotate findings.
                </li>
              </ul>
            </aside>
          </main>

          <section className="mt-6 rounded-[36px] border border-medviz-line/80 bg-[rgba(15,39,69,0.88)] px-6 py-7 shadow-[0_24px_70px_rgba(3,10,18,0.4)] backdrop-blur lg:px-8">
            <div className="flex flex-col gap-3 border-b border-medviz-line/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-display text-xs font-bold uppercase tracking-[0.4em] text-medviz-accent">
                  Saved Cases
                </p>
                <h2 className="mt-2 font-display text-3xl font-bold text-medviz-ink">Recent cases</h2>
              </div>
              <p className="max-w-lg text-sm leading-6 text-white/65">
                Open any case to continue the review or add the patient model when you are ready.
              </p>
            </div>

            {errorMessage ? (
              <div className="mt-6 rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">
                {errorMessage}
              </div>
            ) : null}

            {isLoadingCases ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-48 animate-pulse rounded-[28px] border border-medviz-line/70 bg-[rgba(9,22,39,0.85)]"
                  />
                ))}
              </div>
            ) : cases.length > 0 ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {cases.map((caseItem) => (
                  <article
                    key={caseItem.id}
                    className="group rounded-[24px] border border-medviz-line/80 bg-[linear-gradient(180deg,rgba(9,22,39,0.94),rgba(15,39,69,0.9))] p-4 shadow-[0_10px_30px_rgba(3,10,18,0.3)] transition hover:-translate-y-1 hover:border-medviz-accent/45 hover:shadow-[0_20px_50px_rgba(79,174,255,0.16)] sm:p-5"
                  >
                    {(() => {
                      const isLocal = isLocalCaseId(caseItem.id);
                      const isMember = memberCaseIds.has(caseItem.id);
                      const caseHref = isLocal
                        ? `/editor?caseId=${caseItem.id}`
                        : `/cases/${caseItem.id}`;
                      const modelLabel = caseItem.model_url
                        ? isLocal
                          ? caseItem.model_url
                          : getCaseModelFileName(caseItem.model_url)
                        : 'No model added yet';

                      return (
                        <>
                          <Link to={caseHref} className="block">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0 space-y-2">
                                {isLocal ? (
                                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-[rgba(255,197,76,0.08)] px-3 py-1 text-[11px] font-semibold text-amber-400">
                                    <FiHardDrive className="h-3.5 w-3.5" />
                                    Browser only
                                  </span>
                                ) : isMember ? (
                                  <span className="inline-flex items-center gap-2 rounded-full border border-medviz-gold/30 bg-[rgba(255,197,76,0.06)] px-3 py-1 text-[11px] font-semibold text-medviz-gold">
                                    <FiFolder className="h-3.5 w-3.5" />
                                    Shared with me
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-2 rounded-full border border-medviz-line bg-[rgba(9,22,39,0.9)] px-3 py-1 text-[11px] font-semibold text-medviz-ink/80">
                                    <FiLock className="h-3.5 w-3.5 text-medviz-accent" />
                                    {caseItem.visibility}
                                  </span>
                                )}
                                <h3 className="line-clamp-2 font-display text-xl font-bold text-medviz-ink sm:text-2xl">
                                  {caseItem.title}
                                </h3>
                              </div>
                              <div className="rounded-full bg-medviz-accent p-2.5 text-[#060f1a] transition group-hover:bg-[#7ad9ff]">
                                <FiArrowRight className="h-4 w-4 sm:h-4 sm:w-4" />
                              </div>
                            </div>

                            <p className="mt-3 line-clamp-2 min-h-[3rem] text-sm leading-6 text-white/72">
                              {caseItem.description || 'No description added yet.'}
                            </p>

                            <div className="mt-4 grid gap-2 text-sm text-white/65">
                              <div className="flex items-center gap-3">
                                <FiFileMarker />
                                <span className="truncate">{modelLabel}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <FiClock className="h-4 w-4 text-medviz-accent" />
                                <span>{dateFormatter.format(new Date(caseItem.created_at))}</span>
                              </div>
                            </div>
                          </Link>

                          <div className="mt-4 grid gap-2 border-t border-medviz-line/70 pt-3 sm:grid-cols-[auto_auto_1fr] sm:items-center">
                            <div className="flex gap-2">
                              {!isLocal && !isMember && (
                                <Link
                                  to={`/cases/${caseItem.id}/edit`}
                                  className="inline-flex items-center gap-2 rounded-full border border-medviz-line bg-[rgba(9,22,39,0.88)] px-3 py-2 text-sm font-semibold text-medviz-ink transition hover:border-medviz-gold hover:text-medviz-gold"
                                >
                                  <FiEdit3 className="h-4 w-4" />
                                  Edit
                                </Link>
                              )}
                              {!isMember && (
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteCase(caseItem)}
                                  disabled={deletingCaseId === caseItem.id}
                                  className="inline-flex items-center gap-2 rounded-full border border-rose-400/25 bg-[rgba(127,29,29,0.18)] px-3 py-2 text-sm font-semibold text-rose-100 transition hover:border-rose-300 hover:bg-[rgba(127,29,29,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <FiTrash2 className="h-4 w-4" />
                                  {deletingCaseId === caseItem.id ? 'Deleting...' : 'Delete'}
                                </button>
                              )}
                            </div>
                            <Link
                              to={caseHref}
                              className="inline-flex items-center justify-center gap-2 rounded-full bg-medviz-accent px-4 py-2 text-sm font-semibold text-[#060f1a] transition hover:bg-[#7ad9ff] sm:justify-self-end sm:col-start-3"
                            >
                              {isLocal ? 'Open Editor' : 'Open Case'}
                              <FiArrowRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </>
                      );
                    })()}
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-[30px] border border-dashed border-medviz-line bg-[rgba(9,22,39,0.78)] px-6 py-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(15,39,69,0.95)] text-medviz-accent shadow-[0_12px_30px_rgba(79,174,255,0.12)]">
                  <FiFolder className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display text-2xl font-bold text-medviz-ink">No clinical cases yet</h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/66">
                  Start by adding a case. You can bring the patient model into 3D review after the case opens.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/cases/new')}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-medviz-accent px-5 py-3 text-sm font-semibold text-[#060f1a] transition hover:bg-[#7ad9ff]"
                >
                  <FiPlus className="h-4 w-4" />
                  Add Your First Case
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

    </>
  );
}

function FiFileMarker() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(15,39,69,0.95)] text-medviz-accent shadow-[0_8px_18px_rgba(3,10,18,0.24)]">
      <FiBox className="h-4 w-4" />
    </span>
  );
}
