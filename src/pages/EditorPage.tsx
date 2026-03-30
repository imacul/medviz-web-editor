import { Suspense, lazy, useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import { FiAlertCircle, FiArrowLeft, FiArrowRight, FiCheck, FiCopy, FiLock } from 'react-icons/fi';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { getSupabaseClient } from '../lib/supabase/client';
import CommentThread from '../components/CommentThread';

import { getCachedCaseModelFile, cacheCaseModelFile } from '../features/cases/modelCache';
import {
  getCaseByShareToken,
  deleteCaseModel,
  getCaseById,
  getCaseModelFileName,
  resolveCaseModelUrl,
  updateCaseEditorState,
  updateCaseModelAssets,
  updateCaseOptimizedModelUrl,
  uploadCaseModel,
  uploadOptimizedCaseModel,
  type ClinicalCase,
  type EditorState,
  isLocalCaseId,
  getLocalCase,
  updateLocalCase,
  getLocalCaseModelFile,
  saveLocalCaseModelFile,
  toLocalClinicalCase,
} from '../features/cases';
import { getMyRoleInCase } from '../features/team';
import { useAuth } from '../features/auth/AuthProvider';
import { buildOptimizedModelAsset } from '../medviz/io/modelImport';
import { loadMedical3DCanvas } from './preload';

type ModelSource =
  | File
  | {
      kind: 'remote';
      url: string;
      fileName: string;
      fileSizeBytes?: number;
    }
  | null;

type InitialModelState = 'importing' | 'ready' | 'error';

interface EditorOverlayState {
  title: string;
  description: string;
  detail: string;
  progress: number | null;
  variant?: 'blocking' | 'status';
}

const Medical3DCanvas = lazy(loadMedical3DCanvas);

const Medical3DCanvasView = Medical3DCanvas as ComponentType<{
  initialModelSource?: ModelSource;
  onGoHome: () => void;
  onInitialModelStateChange?: (state: InitialModelState) => void;
  onImportedModelPersist?: (file: File) => Promise<void>;
  readOnly?: boolean;
  emptyState?: {
    title: string;
    description: string;
  } | null;
  initialEditorState?: EditorState | null;
  onEditorStateChange?: (state: EditorState) => void;
  externalEditorState?: EditorState | null;
  showShareToggle?: boolean;
  sharePanelOpen?: boolean;
  onToggleSharePanel?: () => void;
  showCommentsToggle?: boolean;
  commentsPanelOpen?: boolean;
  onToggleCommentsPanel?: () => void;
}>;

export default function EditorPage() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const caseId = searchParams.get('caseId');
  const shareToken = searchParams.get('shareToken')?.trim() || null;
  const requestedDrawer = searchParams.get('drawer');
  const [caseRecord, setCaseRecord] = useState<ClinicalCase | null>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [initialModelSource, setInitialModelSource] = useState<ModelSource>(null);
  const [externalEditorState, setExternalEditorState] = useState<EditorState | null>(null);
  const lastSavedStateRef = useRef<EditorState | null>(null);
  const [overlayState, setOverlayState] = useState<EditorOverlayState | null>(null);
  const [saveState, setSaveState] = useState<EditorOverlayState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeModelLabel, setActiveModelLabel] = useState<string | null>(null);
  const [activeDrawer, setActiveDrawer] = useState<'share' | 'comments' | null>(null);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!caseId && !shareToken) {
      navigate(
        user ? '/cases/new' : '/login?redirectTo=%2Feditor',
        { replace: true }
      );
    }
  }, [caseId, isLoading, navigate, shareToken, user]);

  useEffect(() => {
    document.body.classList.add('editor-mode');
    return () => {
      document.body.classList.remove('editor-mode');
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    if (!caseId && !shareToken) {
      setInitialModelSource(null);
      setCaseRecord(null);
      setIsViewOnly(false);
      setOverlayState(null);
      setSaveState(null);
      setErrorMessage(null);
      setActiveModelLabel(null);
      return () => {
        isMounted = false;
        abortController.abort();
      };
    }

    const loadCaseIntoEditor = async () => {
      setErrorMessage(null);
      setInitialModelSource(null);
      setOverlayState(null);

      try {
        if (!shareToken && caseId && !isLocalCaseId(caseId)) {
          if (isLoading) {
            return;
          }

          if (!user) {
            navigate(
              `/login?redirectTo=${encodeURIComponent(`/editor?caseId=${caseId}`)}`,
              { replace: true }
            );
            return;
          }
        }

        // ── Local (browser-only) case path ──────────────────────────────────
        if (isLocalCaseId(caseId)) {
          const localRecord = getLocalCase(caseId);
          if (!localRecord) throw new Error('Local case not found in this browser.');

          const record = toLocalClinicalCase(localRecord);
          if (isMounted) setCaseRecord(record);

          if (!localRecord.modelFileName) return; // no model yet — open empty editor

          if (isMounted) {
            setActiveModelLabel(localRecord.modelFileName);
            setOverlayState({
              title: 'Opening patient model',
              description: 'Loading from browser storage.',
              detail: localRecord.modelFileName,
              progress: null,
              variant: 'blocking',
            });
          }

          const cachedFile = await getLocalCaseModelFile(caseId, localRecord.modelFileName).catch(
            () => null
          );

          if (isMounted) {
            if (cachedFile) {
              setOverlayState({
                title: 'Opening patient model',
                description: 'Loading from browser storage.',
                detail: localRecord.modelFileName,
                progress: 100,
                variant: 'blocking',
              });
              setInitialModelSource(cachedFile);
            } else {
              // Metadata says there's a model but the file is gone — clear the ref
              updateLocalCase(caseId, { modelFileName: null });
              setOverlayState(null);
            }
          }
          return;
        }

        // ── Cloud case path ─────────────────────────────────────────────────
        if (shareToken) {
          const sharedRecord = await getCaseByShareToken(shareToken);

          if (!sharedRecord) {
            throw new Error('Shared case not found or no longer available.');
          }

          let sharedViewOnly = !user;
          if (user) {
            const isOwner = sharedRecord.created_by === user.id;
            if (!isOwner) {
              const role = await getMyRoleInCase(sharedRecord.id);
              sharedViewOnly = role !== 'editor';
            } else {
              sharedViewOnly = false;
            }
          }

          if (isMounted) {
            setCaseRecord(sharedRecord);
            setIsViewOnly(sharedViewOnly);
          }

          const editorModelUrl = sharedRecord.optimized_model_url || sharedRecord.model_url;
          if (!editorModelUrl) {
            if (isMounted) {
              setOverlayState(null);
              setInitialModelSource(null);
              setActiveModelLabel(null);
              setErrorMessage(null);
            }
            return;
          }

          const fileName = getCaseModelFileName(editorModelUrl);

          if (isMounted) {
            setActiveModelLabel(fileName);
            setOverlayState({
              title: 'Opening patient model',
              description: 'Checking for a local copy before downloading.',
              detail: fileName,
              progress: null,
              variant: 'blocking',
            });
          }

          const cachedFile = await getCachedCaseModelFile(editorModelUrl, fileName).catch(() => null);

          if (cachedFile) {
            if (isMounted) {
              setOverlayState({
                title: 'Opening patient model',
                description: 'Using the local copy for a faster start.',
                detail: fileName,
                progress: 100,
                variant: 'blocking',
              });
              setInitialModelSource(cachedFile);
            }
            return;
          }

          const signedUrl = await resolveCaseModelUrl(editorModelUrl);
          const downloadedFile = await downloadModelFile(
            signedUrl,
            fileName,
            abortController.signal,
            ({ loaded, total, percent }) => {
              if (!isMounted) {
                return;
              }

              setOverlayState({
                title: 'Opening patient model',
                description: 'Downloading the saved model into the review workspace.',
                detail:
                  total > 0
                    ? `${formatMegabytes(loaded)} MB of ${formatMegabytes(total)} MB`
                    : `${formatMegabytes(loaded)} MB downloaded`,
                progress: percent,
                variant: 'blocking',
              });
            }
          );

          void cacheCaseModelFile(editorModelUrl, downloadedFile).catch((cacheError) => {
            console.warn('Failed to cache case model locally:', cacheError);
          });

          if (isMounted) {
            setOverlayState({
              title: 'Opening patient model',
              description: 'Loading the model into 3D review.',
              detail: fileName,
              progress: 100,
              variant: 'blocking',
            });
            setInitialModelSource(downloadedFile);
          }
          return;
        }

        const record = await getCaseById(caseId);

        if (!record) {
          throw new Error('Clinical case not found.');
        }

        const isOwner = user?.id && record.created_by === user.id;
        let viewOnly = false;
        if (!isOwner) {
          const role = await getMyRoleInCase(caseId);
          viewOnly = role === 'viewer';
        }

        if (isMounted) {
          setCaseRecord(record);
          setIsViewOnly(viewOnly);
        }

        const editorModelUrl = record.optimized_model_url || record.model_url;
        if (!editorModelUrl) {
          if (isMounted) {
            setOverlayState(null);
            setInitialModelSource(null);
            setActiveModelLabel(null);
            setErrorMessage(null);
          }
          return;
        }

        const fileName = getCaseModelFileName(editorModelUrl);

        if (isMounted) {
          setActiveModelLabel(fileName);
          setOverlayState({
            title: 'Opening patient model',
            description: 'Checking for a local copy before downloading.',
            detail: fileName,
            progress: null,
            variant: 'blocking',
          });
        }

        const cachedFile = await getCachedCaseModelFile(editorModelUrl, fileName).catch(() => null);

        if (cachedFile) {
          if (isMounted) {
            setOverlayState({
              title: 'Opening patient model',
              description: 'Using the local copy for a faster start.',
              detail: fileName,
              progress: 100,
              variant: 'blocking',
            });
            setInitialModelSource(cachedFile);
          }
          return;
        }

        const signedUrl = await resolveCaseModelUrl(editorModelUrl);
        const downloadedFile = await downloadModelFile(
          signedUrl,
          fileName,
          abortController.signal,
          ({ loaded, total, percent }) => {
            if (!isMounted) {
              return;
            }

            setOverlayState({
              title: 'Opening patient model',
              description: 'Downloading the saved model into the review workspace.',
              detail:
                total > 0
                  ? `${formatMegabytes(loaded)} MB of ${formatMegabytes(total)} MB`
                  : `${formatMegabytes(loaded)} MB downloaded`,
              progress: percent,
              variant: 'blocking',
            });
          }
        );

        void cacheCaseModelFile(editorModelUrl, downloadedFile).catch((cacheError) => {
          console.warn('Failed to cache case model locally:', cacheError);
        });

        if (isMounted) {
          setOverlayState({
            title: 'Opening patient model',
            description: 'Loading the model into 3D review.',
            detail: fileName,
            progress: 100,
            variant: 'blocking',
          });
          setInitialModelSource(downloadedFile);
        }
      } catch (error) {
        if (!isMounted || abortController.signal.aborted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : 'Failed to load the selected case.');
        setOverlayState(null);
      }
    };

    void loadCaseIntoEditor();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [caseId, isLoading, navigate, shareToken, user]);

  const handleInitialModelStateChange = (state: InitialModelState) => {
    if (state === 'importing') {
      setOverlayState((current) => {
        if (!current) {
          return {
            title: 'Preparing review workspace',
            description: 'Finishing the 3D scene and review tools.',
            detail: activeModelLabel ?? 'Patient model',
            progress: null,
            variant: 'status',
          };
        }

        return {
          title: 'Preparing review workspace',
          description: 'Finishing the 3D scene and review tools.',
          detail: current.detail,
          progress: null,
          variant: 'status',
        };
      });
      return;
    }

    if (state === 'ready') {
      setOverlayState(null);
      setErrorMessage(null);
      return;
    }

    if (state === 'error') {
      setOverlayState(null);
      setErrorMessage('The patient model could not be loaded into 3D review.');
    }
  };

  const editorStateSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleEditorStateChange = useCallback((state: EditorState) => {
    if (!caseRecord || isLocalCaseId(caseRecord.id) || isViewOnly) return;
    lastSavedStateRef.current = state;
    if (editorStateSaveTimer.current) clearTimeout(editorStateSaveTimer.current);
    editorStateSaveTimer.current = setTimeout(() => {
      void updateCaseEditorState(caseRecord.id, state).catch(() => undefined);
    }, 2000);
  }, [caseRecord, isViewOnly]);

  // Subscribe to real-time editor_state changes from other users
  const realtimeCaseId =
    caseRecord && !isLocalCaseId(caseRecord.id)
      ? caseRecord.id
      : caseId && !isLocalCaseId(caseId)
        ? caseId
        : null;

  useEffect(() => {
    if (!realtimeCaseId) return;

    const client = getSupabaseClient();
    const channel = client
      .channel(`editor-state:${realtimeCaseId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'cases', filter: `id=eq.${realtimeCaseId}` },
        (payload) => {
          const newState = (payload.new as { editor_state?: EditorState | null }).editor_state ?? null;
          if (!newState) return;
          // Skip if identical to what we just saved (our own write bouncing back)
          const last = lastSavedStateRef.current;
          if (last && JSON.stringify(newState) === JSON.stringify(last)) return;
          setExternalEditorState(newState);
        }
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [realtimeCaseId]);

  const handleImportedModelPersist = async (file: File) => {
    if (!caseRecord) {
      throw new Error('Open a case before adding a patient model.');
    }

    // ── Local (browser-only) persist path ───────────────────────────────────
    if (isLocalCaseId(caseRecord.id)) {
      await saveLocalCaseModelFile(caseRecord.id, file);
      updateLocalCase(caseRecord.id, { modelFileName: file.name });
      setCaseRecord((prev) => (prev ? { ...prev, model_url: file.name } : prev));
      setActiveModelLabel(file.name);
      return;
    }

    // ── Cloud persist path ───────────────────────────────────────────────────
    const previousModelUrl = caseRecord.model_url;
    const previousOptimizedUrl = caseRecord.optimized_model_url;
    let uploadedModelUrl: string | null = null;

    setSaveState({
      title: 'Saving patient model',
      description: 'Saving this file to the case so it opens directly in 3D review next time.',
      detail: 'Starting upload',
      progress: 0,
      variant: 'status',
    });

    try {
      const uploadResult = await uploadCaseModel(file, undefined, {
        onProgress: ({ loaded, total, percent }) => {
          setSaveState({
            title: 'Saving patient model',
            description: 'Uploading the patient model to this case.',
            detail:
              total > 0
                ? `${formatMegabytes(loaded)} MB of ${formatMegabytes(total)} MB`
                : `${formatMegabytes(loaded)} MB uploaded`,
            progress: percent,
            variant: 'status',
          });
        },
      });
      uploadedModelUrl = uploadResult.modelUrl;

      setSaveState({
        title: 'Saving patient model',
        description: 'Linking the imported file to this case.',
        detail: getCaseModelFileName(uploadResult.modelUrl),
        progress: 100,
        variant: 'status',
      });

      const updatedCase = await updateCaseModelAssets(caseRecord.id, {
        model_url: uploadResult.modelUrl,
        optimized_model_url: null,
      });

      setCaseRecord(updatedCase);
      setActiveModelLabel(getCaseModelFileName(uploadResult.modelUrl));
      setErrorMessage(null);

      void cacheCaseModelFile(uploadResult.modelUrl, file).catch((cacheError) => {
        console.warn('Failed to cache the imported model locally:', cacheError);
      });

      if (previousModelUrl && previousModelUrl !== uploadResult.modelUrl) {
        void deleteCaseModel(previousModelUrl).catch((deleteError) => {
          console.warn('Failed to remove the previous case model:', deleteError);
        });
      }

      if (previousOptimizedUrl) {
        void deleteCaseModel(previousOptimizedUrl).catch((deleteError) => {
          console.warn('Failed to remove the previous fast review copy:', deleteError);
        });
      }

      void buildOptimizedModelAsset(file)
        .then(async (optimizedAsset) => {
          const optimizedUpload = await uploadOptimizedCaseModel(
            new Blob([optimizedAsset.buffer], { type: optimizedAsset.contentType }),
            optimizedAsset.fileName
          );

          const optimizedCase = await updateCaseOptimizedModelUrl(caseRecord.id, optimizedUpload.modelUrl);
          setCaseRecord(optimizedCase);
        })
        .catch((optimizationError) => {
          console.warn('Failed to prepare the fast review copy:', optimizationError);
        });
    } catch (error) {
      if (uploadedModelUrl) {
        void deleteCaseModel(uploadedModelUrl).catch(() => {
          // Preserve the original save error.
        });
      }

      throw error instanceof Error
        ? error
        : new Error('The patient model opened, but it could not be saved to this case.');
    } finally {
      setSaveState(null);
    }
  };

  if (!caseId && !shareToken) {
    return null;
  }

  const blockingOverlay =
    saveState?.variant === 'blocking'
      ? saveState
      : overlayState?.variant === 'blocking'
        ? overlayState
        : null;

  const statusOverlay =
    saveState?.variant === 'status'
      ? saveState
      : overlayState?.variant === 'status'
        ? overlayState
        : null;

  const backToCasePath = shareToken
    ? `/share/${shareToken}`
    : caseRecord && !isLocalCaseId(caseRecord.id)
      ? `/cases/${caseRecord.id}`
      : '/dashboard';
  const isCloudCase = Boolean(caseRecord && !isLocalCaseId(caseRecord.id));
  const isCaseOwner = Boolean(caseRecord && user?.id && caseRecord.created_by === user.id);
  const shareUrl = caseRecord?.share_token
    ? `${window.location.origin}/share/${caseRecord.share_token}`
    : null;
  const isPublicCase = caseRecord?.visibility === 'public';
  const requiresTeamSignup = Boolean(shareToken && !user);
  const teamPromptMode =
    requiresTeamSignup && (activeDrawer === 'share' || activeDrawer === 'comments')
      ? activeDrawer
      : null;
  const shareDrawerRedirectTo = shareToken
    ? `/editor?shareToken=${encodeURIComponent(shareToken)}&drawer=share`
    : '/dashboard';
  const commentsDrawerRedirectTo = shareToken
    ? `/editor?shareToken=${encodeURIComponent(shareToken)}&drawer=comments`
    : '/dashboard';

  useEffect(() => {
    if (!isCloudCase && activeDrawer) {
      setActiveDrawer(null);
    }
  }, [activeDrawer, isCloudCase]);

  useEffect(() => {
    if (!requestedDrawer || !shareToken) {
      return;
    }

    if (requestedDrawer === 'share' || requestedDrawer === 'comments') {
      setActiveDrawer(requestedDrawer);
    }
  }, [requestedDrawer, shareToken]);

  const handleToggleShareDrawer = () => {
    setActiveDrawer((current) => (current === 'share' ? null : 'share'));
  };

  const handleToggleCommentsDrawer = () => {
    setActiveDrawer((current) => (current === 'comments' ? null : 'comments'));
  };

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl).catch(() => undefined);
    setShareLinkCopied(true);
    window.setTimeout(() => setShareLinkCopied(false), 1800);
  };

  return (
    <div className="relative min-h-screen">
      {/* Floating back-to-case button */}
      {caseRecord && (
        <div className="pointer-events-none absolute inset-x-0 bottom-5 z-200 flex justify-center">
          <Link
            to={backToCasePath}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/18 bg-[rgba(9,22,39,0.88)] px-4 py-2 text-sm font-semibold text-white/80 shadow-lg backdrop-blur transition hover:border-medviz-accent hover:text-medviz-accent"
          >
            <FiArrowLeft className="h-3.5 w-3.5" />
            {shareToken ? 'Shared Case' : 'Case Page'}
          </Link>
        </div>
      )}
      <Suspense
        fallback={
          <EditorCanvasFallback
            caseTitle={caseRecord?.title ?? null}
            modelLabel={activeModelLabel}
          />
        }
      >
        <Medical3DCanvasView
          initialModelSource={initialModelSource}
          onGoHome={() =>
            navigate(backToCasePath)
          }
          onInitialModelStateChange={handleInitialModelStateChange}
          onImportedModelPersist={isViewOnly ? undefined : handleImportedModelPersist}
          readOnly={isViewOnly}
          initialEditorState={caseRecord?.editor_state ?? null}
          onEditorStateChange={isViewOnly ? undefined : handleEditorStateChange}
          externalEditorState={externalEditorState}
          showShareToggle={isCloudCase}
          sharePanelOpen={activeDrawer === 'share'}
          onToggleSharePanel={isCloudCase ? handleToggleShareDrawer : undefined}
          showCommentsToggle={isCloudCase}
          commentsPanelOpen={activeDrawer === 'comments'}
          onToggleCommentsPanel={isCloudCase ? handleToggleCommentsDrawer : undefined}
        />
      </Suspense>

      {isCloudCase && (
        <div className="pointer-events-none absolute bottom-[52px] right-0 top-[114px] z-140 md:top-[72px]">
          <aside
            className={`pointer-events-auto h-full w-[min(430px,100vw)] border-l border-medviz-line/70 bg-[linear-gradient(180deg,rgba(6,15,26,0.94),rgba(7,18,33,0.9))] p-4 shadow-[-22px_0_70px_rgba(3,10,18,0.55)] backdrop-blur transition-all duration-300 ease-out ${
              activeDrawer ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
            }`}
            aria-hidden={!activeDrawer}
          >
            {activeDrawer === 'share' ? (
              <section className="flex h-full flex-col rounded-[24px] border border-medviz-line/60 bg-[rgba(9,22,39,0.82)] p-5 text-white">
                {teamPromptMode === 'share' ? (
                  <TeamFeatureSignupGate
                    title="Create an account to share this case"
                    description="Anonymous reviewers can explore the model, but sharing a case link is a team feature. Create an account or sign in to continue."
                    loginTo={shareDrawerRedirectTo}
                    signupTo={shareDrawerRedirectTo}
                  />
                ) : (
                  <>
                    <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-medviz-accent">
                      Shareable Case Link
                    </p>
                    <h2 className="mt-2 font-display text-2xl font-bold text-medviz-ink">
                      {isPublicCase ? 'Copy secure review link' : 'Sharing is currently private'}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-white/68">
                      {isPublicCase
                        ? 'Share this link with teammates who should review this case.'
                        : 'Make this case public from the case page to generate a shareable external link.'}
                    </p>

                    {isPublicCase && shareUrl ? (
                      <div className="mt-5 rounded-2xl border border-medviz-line/60 bg-[rgba(7,17,31,0.86)] p-3">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/48">
                          Public Link
                        </label>
                        <div className="mt-2 flex gap-2">
                          <input
                            value={shareUrl}
                            readOnly
                            className="flex-1 rounded-xl border border-medviz-line/60 bg-[rgba(3,10,18,0.85)] px-3 py-2 text-xs text-medviz-ink"
                            aria-label="Shareable case link"
                          />
                          <button
                            type="button"
                            onClick={() => void handleCopyShareLink()}
                            className="inline-flex items-center gap-2 rounded-xl border border-medviz-line/60 bg-[rgba(9,22,39,0.92)] px-3 py-2 text-xs font-semibold text-medviz-ink transition hover:border-medviz-accent hover:text-medviz-accent"
                          >
                            {shareLinkCopied ? (
                              <>
                                <FiCheck className="h-3.5 w-3.5 text-medviz-accent" />
                                Copied
                              </>
                            ) : (
                              <>
                                <FiCopy className="h-3.5 w-3.5" />
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <Link
                        to={backToCasePath}
                        className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-medviz-line bg-[rgba(9,22,39,0.9)] px-4 py-2 text-sm font-semibold text-medviz-ink transition hover:border-medviz-accent hover:text-medviz-accent"
                      >
                        Open Case Page
                        <FiArrowLeft className="h-3.5 w-3.5 rotate-180" />
                      </Link>
                    )}

                    {isCaseOwner ? (
                      <p className="mt-auto pt-4 text-xs text-white/52">
                        Tip: owners can control visibility from the case page.
                      </p>
                    ) : null}
                  </>
                )}
              </section>
            ) : activeDrawer === 'comments' ? (
              teamPromptMode === 'comments' ? (
                <TeamFeatureSignupGate
                  title="Create an account to join the comments"
                  description="Anonymous reviewers can inspect the shared case, but comments are reserved for signed-in team members."
                  loginTo={commentsDrawerRedirectTo}
                  signupTo={commentsDrawerRedirectTo}
                />
              ) : (
                <CommentThread
                  caseId={caseRecord!.id}
                  isOwner={isCaseOwner}
                  variant="panel"
                  className="h-full"
                />
              )
            ) : (
              <div className="flex h-full items-center justify-center rounded-[24px] border border-medviz-line/60 bg-[rgba(9,22,39,0.72)] p-5 text-center text-sm text-white/58">
                Use the top bar buttons to open Share Link or Team Comments.
              </div>
            )}
          </aside>
        </div>
      )}

      {/* View-only banner for shared viewers */}
      {isViewOnly && (
        <div className="pointer-events-none absolute inset-x-0 top-20 z-150 flex justify-center px-4">
          <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-medviz-gold/40 bg-[rgba(9,22,39,0.88)] px-4 py-2 text-sm font-semibold text-medviz-gold shadow-lg backdrop-blur">
            View only — you can explore the model but cannot make changes
          </div>
        </div>
      )}

      {blockingOverlay ? (
        <div className="pointer-events-none absolute inset-0 z-120 flex items-start justify-center bg-[rgba(6,15,26,0.32)] px-4 pt-24 sm:pt-28">
          <div className="w-full max-w-md rounded-3xl border border-medviz-line/80 bg-[linear-gradient(160deg,rgba(9,22,39,0.94),rgba(15,39,69,0.9))] px-5 py-5 text-white shadow-[0_20px_60px_rgba(3,10,18,0.35)] backdrop-blur">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-medviz-line/70 bg-[rgba(15,39,69,0.88)]">
                <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-medviz-accent/25 border-t-medviz-accent" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-medviz-gold">
                  3D Review
                </p>
                <h1 className="mt-1 font-display text-2xl font-bold text-medviz-ink">
                  {blockingOverlay.title}
                </h1>
                <p className="mt-1 text-sm text-white/68">{blockingOverlay.description}</p>
              </div>
            </div>

            {caseRecord ? (
              <div className="mt-4 rounded-[18px] border border-white/12 bg-white/8 px-4 py-3 text-left backdrop-blur-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/46">Case</div>
                <div className="mt-1 truncate font-display text-lg font-bold text-medviz-ink">{caseRecord.title}</div>
                <div className="mt-1 truncate text-sm text-white/62">
                  {activeModelLabel ||
                    (isLocalCaseId(caseRecord.id)
                      ? (caseRecord.model_url ?? '')
                      : getCaseModelFileName(
                          caseRecord.optimized_model_url || caseRecord.model_url
                        ))}
                </div>
              </div>
            ) : null}

            <div className="mt-4 text-left">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.22em] text-white/52">
                <span>Progress</span>
                <span>{blockingOverlay.progress !== null ? `${blockingOverlay.progress}%` : 'Preparing'}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-medviz-accent transition-[width] duration-300"
                  style={{ width: `${blockingOverlay.progress ?? 18}%` }}
                />
              </div>
              <div className="mt-2 truncate text-sm text-white/60">{blockingOverlay.detail}</div>
            </div>
          </div>
        </div>
      ) : null}

      {statusOverlay ? (
        <div className="pointer-events-none absolute right-4 top-22 z-125 max-w-sm sm:right-6 sm:top-24">
          <div className="rounded-2xl border border-medviz-line/80 bg-[linear-gradient(160deg,rgba(9,22,39,0.94),rgba(15,39,69,0.9))] px-4 py-4 text-white shadow-[0_18px_40px_rgba(3,10,18,0.32)] backdrop-blur">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-medviz-line/70 bg-[rgba(15,39,69,0.88)]">
                <div className="h-4 w-4 animate-spin rounded-full border-[3px] border-medviz-accent/25 border-t-medviz-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-medviz-gold">3D Review</p>
                <p className="mt-1 font-display text-lg font-bold text-medviz-ink">{statusOverlay.title}</p>
                <p className="mt-1 text-sm text-white/68">{statusOverlay.description}</p>
                {statusOverlay.progress !== null ? (
                  <>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-medviz-accent transition-[width] duration-300"
                        style={{ width: `${statusOverlay.progress}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-white/56">
                      <span className="truncate">{statusOverlay.detail}</span>
                      <span className="ml-3 shrink-0">{statusOverlay.progress}%</span>
                    </div>
                  </>
                ) : (
                  <div className="mt-2 truncate text-sm text-white/60">{statusOverlay.detail}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="absolute inset-0 z-130 flex items-center justify-center bg-[rgba(6,15,26,0.82)] px-4 text-white">
          <div className="relative max-w-lg rounded-[34px] border border-rose-500/25 bg-[linear-gradient(160deg,rgba(9,22,39,0.96),rgba(15,39,69,0.92))] px-8 py-10 text-center shadow-[0_30px_90px_rgba(3,10,18,0.55)] backdrop-blur">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/16 text-rose-200">
              <FiAlertCircle className="h-6 w-6" />
            </div>
            <h1 className="mt-4 font-display text-3xl font-bold">Unable to open the model</h1>
            <p className="mt-3 text-sm leading-6 text-white/74">{errorMessage}</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                to={shareToken ? backToCasePath : '/dashboard'}
                className="inline-flex items-center gap-2 rounded-full border border-white/18 px-5 py-3 text-sm font-semibold text-white transition hover:border-medviz-gold hover:text-medviz-gold"
              >
                <FiArrowLeft className="h-4 w-4" />
                {shareToken ? 'Back to Shared Case' : 'Case List'}
              </Link>
              {shareToken ? (
                <Link
                  to={backToCasePath}
                  className="rounded-full bg-medviz-accent px-5 py-3 text-sm font-semibold text-[#060f1a] transition hover:bg-[#7ad9ff]"
                >
                  Shared Case
                </Link>
              ) : caseId ? (
                <Link
                  to={`/cases/${caseId}`}
                  className="rounded-full bg-medviz-accent px-5 py-3 text-sm font-semibold text-[#060f1a] transition hover:bg-[#7ad9ff]"
                >
                  Back to Case
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TeamFeatureSignupGate({
  title,
  description,
  loginTo,
  signupTo,
}: {
  title: string;
  description: string;
  loginTo: string;
  signupTo: string;
}) {
  return (
    <div className="flex h-full flex-col rounded-[24px] border border-medviz-line/60 bg-[rgba(9,22,39,0.82)] p-5 text-white">
      <p className="inline-flex w-fit items-center gap-2 rounded-full border border-medviz-line/60 bg-[rgba(7,17,31,0.82)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.3em] text-medviz-gold">
        <FiLock className="h-3.5 w-3.5" />
        Team Feature
      </p>
      <h2 className="mt-4 font-display text-2xl font-bold text-medviz-ink">{title}</h2>
      <p className="mt-3 max-w-sm text-sm leading-6 text-white/70">{description}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to={`/signup?redirectTo=${encodeURIComponent(signupTo)}`}
          className="inline-flex items-center gap-2 rounded-full bg-medviz-accent px-5 py-3 text-sm font-semibold text-[#060f1a] transition hover:bg-[#7ad9ff]"
        >
          Create Account
          <FiArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to={`/login?redirectTo=${encodeURIComponent(loginTo)}`}
          className="inline-flex items-center gap-2 rounded-full border border-medviz-line bg-[rgba(9,22,39,0.92)] px-5 py-3 text-sm font-semibold text-medviz-ink transition hover:border-medviz-accent hover:text-medviz-accent"
        >
          Sign In
        </Link>
      </div>

      <p className="mt-auto pt-6 text-xs leading-5 text-white/48">
        You can keep exploring the shared model without an account. Signing in unlocks comments
        and case collaboration.
      </p>
    </div>
  );
}

function EditorCanvasFallback({
  caseTitle,
  modelLabel,
}: {
  caseTitle: string | null;
  modelLabel: string | null;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(84,176,255,0.16),transparent_42%),linear-gradient(180deg,#07111d_0%,#091627_48%,#0f2745_100%)] px-4">
      <div className="w-full max-w-sm rounded-3xl border border-medviz-line/80 bg-[rgba(9,22,39,0.92)] px-5 py-5 text-white shadow-[0_20px_60px_rgba(3,10,18,0.36)] backdrop-blur">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-medviz-line/70 bg-[rgba(15,39,69,0.88)]">
            <div className="h-5 w-5 animate-spin rounded-full border-[3px] border-medviz-accent/25 border-t-medviz-accent" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-medviz-gold">3D Review</p>
            <p className="mt-1 font-display text-xl font-bold text-medviz-ink">Opening review workspace</p>
            <p className="mt-1 text-sm text-white/62">Preparing the viewer.</p>
          </div>
        </div>

        {caseTitle ? (
          <div className="mt-4 rounded-[18px] border border-white/12 bg-white/8 px-4 py-3 text-left backdrop-blur-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/46">Case</div>
            <div className="mt-1 truncate font-display text-lg font-bold text-medviz-ink">{caseTitle}</div>
            {modelLabel ? <div className="mt-1 truncate text-sm text-white/62">{modelLabel}</div> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

async function downloadModelFile(
  url: string,
  fileName: string,
  signal: AbortSignal,
  onProgress: (progress: { loaded: number; total: number; percent: number | null }) => void
) {
  const response = await fetch(url, {
    cache: 'force-cache',
    signal,
  });

  if (!response.ok) {
    throw new Error('Failed to download the stored model for this case.');
  }

  const total = Number(response.headers.get('content-length')) || 0;
  const body = response.body;

  if (!body) {
    const blob = await response.blob();
    onProgress({
      loaded: blob.size,
      total: total || blob.size,
      percent: total ? 100 : null,
    });
    return new File([blob], fileName, {
      type: blob.type || 'application/octet-stream',
      lastModified: Date.now(),
    });
  }

  const reader = body.getReader();
  const chunks: ArrayBuffer[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    if (!value) {
      continue;
    }

    chunks.push(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
    loaded += value.byteLength;
    onProgress({
      loaded,
      total,
      percent: total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : null,
    });
  }

  const blob = new Blob(chunks, {
    type: response.headers.get('content-type') || 'application/octet-stream',
  });

  onProgress({
    loaded: blob.size,
    total: total || blob.size,
    percent: 100,
  });

  return new File([blob], fileName, {
    type: blob.type || 'application/octet-stream',
    lastModified: Date.now(),
  });
}

function formatMegabytes(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(1);
}
