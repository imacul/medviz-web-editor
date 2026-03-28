import { Suspense, lazy, useEffect, useMemo, useRef, useState, type ComponentType, type FormEvent } from 'react';
import { FiCopy, FiMessageCircle, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router';

import { loadMedical3DCanvas } from './preload';
import './DemoPage.css';

type ModelSource =
  | File
  | {
      kind: 'remote';
      url: string;
      fileName: string;
      fileSizeBytes?: number;
    }
  | null;

type DemoComment = {
  author: string;
  text: string;
  timestamp: string;
};

const Medical3DCanvas = lazy(loadMedical3DCanvas);

const Medical3DCanvasView = Medical3DCanvas as ComponentType<{
  initialModelSource?: ModelSource;
  onGoHome: () => void;
  readOnly?: boolean;
  showShareToggle?: boolean;
  sharePanelOpen?: boolean;
  onToggleSharePanel?: () => void;
  showCommentsToggle?: boolean;
  commentsPanelOpen?: boolean;
  onToggleCommentsPanel?: () => void;
  startTourSignal?: number;
}>;

const INITIAL_COMMENTS: DemoComment[] = [
  {
    author: 'Team Reviewer',
    text: 'Use this panel to simulate collaboration notes while reviewing your own de-identified model.',
    timestamp: '09:00',
  },
];

const INTRO_CARD_AUTO_DISMISS_MS = 15000;
const INTRO_CARD_FADE_MS = 420;

export default function DemoPage() {
  type DemoPanelMode = 'share' | 'comments';
  const navigate = useNavigate();
  const [comments, setComments] = useState<DemoComment[]>(INITIAL_COMMENTS);
  const [author, setAuthor] = useState('Reviewer');
  const [commentText, setCommentText] = useState('');
  const [copied, setCopied] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<DemoPanelMode>('comments');
  const [showIntroCard, setShowIntroCard] = useState(true);
  const [introCardClosing, setIntroCardClosing] = useState(false);
  const [tourLaunchCount, setTourLaunchCount] = useState(0);
  const shareCardRef = useRef<HTMLDivElement | null>(null);
  const commentsCardRef = useRef<HTMLDivElement | null>(null);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return 'https://www.medviz3d.com/demo';
    return `${window.location.origin}/demo`;
  }, []);

  useEffect(() => {
    document.body.classList.add('editor-mode');
    document.title = 'MedViz Free Demo - Bring Your Own Model';
    return () => {
      document.body.classList.remove('editor-mode');
    };
  }, []);

  useEffect(() => {
    if (!panelOpen) return;
    const target = panelMode === 'share' ? shareCardRef.current : commentsCardRef.current;
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [panelMode, panelOpen]);

  useEffect(() => {
    if (!showIntroCard || introCardClosing) return;

    const closeTimer = window.setTimeout(() => {
      setIntroCardClosing(true);
    }, INTRO_CARD_AUTO_DISMISS_MS);

    return () => {
      window.clearTimeout(closeTimer);
    };
  }, [introCardClosing, showIntroCard]);

  useEffect(() => {
    if (!introCardClosing) return;

    const removeTimer = window.setTimeout(() => {
      setShowIntroCard(false);
    }, INTRO_CARD_FADE_MS);

    return () => {
      window.clearTimeout(removeTimer);
    };
  }, [introCardClosing]);

  const handleToggleSharePanel = () => {
    if (panelOpen && panelMode === 'share') {
      setPanelOpen(false);
      return;
    }
    setPanelMode('share');
    setPanelOpen(true);
  };

  const handleToggleCommentsPanel = () => {
    if (panelOpen && panelMode === 'comments') {
      setPanelOpen(false);
      return;
    }
    setPanelMode('comments');
    setPanelOpen(true);
  };

  const dismissIntroCard = () => {
    setIntroCardClosing(true);
  };

  const handleStartTour = () => {
    setTourLaunchCount((current) => current + 1);
  };

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const handleCommentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed) return;

    const next: DemoComment = {
      author: author.trim() || 'Reviewer',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setComments((prev) => [...prev, next]);
    setCommentText('');
  };

  return (
    <div className="demo-page">
      <Suspense fallback={null}>
        <Medical3DCanvasView
          onGoHome={() => navigate('/')}
          readOnly={false}
          startTourSignal={tourLaunchCount}
          showShareToggle
          sharePanelOpen={panelOpen && panelMode === 'share'}
          onToggleSharePanel={handleToggleSharePanel}
          showCommentsToggle
          commentsPanelOpen={panelOpen && panelMode === 'comments'}
          onToggleCommentsPanel={handleToggleCommentsPanel}
        />
      </Suspense>

      <aside
        id="demo-panel"
        className={`demo-panel ${panelOpen ? 'demo-panel--open' : 'demo-panel--closed'}`}
      >
        {showIntroCard ? (
          <div
            className={`demo-panel__card demo-panel__intro ${
              introCardClosing ? 'demo-panel__intro--closing' : ''
            }`}
          >
            <button
              type="button"
              className="demo-panel__close"
              onClick={dismissIntroCard}
              aria-label="Dismiss free demo message"
              title="Dismiss"
            >
              <FiX size={16} />
            </button>
            <p className="demo-panel__eyebrow">Free Demo Mode</p>
            <h1>Try MedViz now. No signup required.</h1>
            <p className="demo-panel__sub">
              Import your own de-identified STL, OBJ, or PLY model and start reviewing immediately. Rotate, zoom,
              measure, annotate, export PDF, and simulate team collaboration in one browser session.
            </p>
          </div>
        ) : null}

        <div
          ref={shareCardRef}
          className={`demo-panel__card ${panelMode === 'share' ? 'demo-panel__card--active' : ''}`}
        >
          <h2>Shareable Case Link (Simulated)</h2>
          <div className="demo-panel__share">
            <input value={shareUrl} readOnly aria-label="Shareable demo link" />
            <button type="button" onClick={copyShareUrl}>
              <FiCopy size={14} />
              {copied ? 'Copied' : 'Copy Link'}
            </button>
          </div>
        </div>

        <div
          ref={commentsCardRef}
          className={`demo-panel__card ${panelMode === 'comments' ? 'demo-panel__card--active' : ''}`}
        >
          <h2>Team Comments (Simulated)</h2>
          <ul className="demo-panel__comments">
            {comments.map((item, index) => (
              <li key={`${item.author}-${item.timestamp}-${index}`}>
                <div>
                  <strong>{item.author}</strong>
                  <span>{item.timestamp}</span>
                </div>
                <p>{item.text}</p>
              </li>
            ))}
          </ul>

          <form onSubmit={handleCommentSubmit} className="demo-panel__form">
            <input
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              aria-label="Comment author"
              placeholder="Reviewer name"
            />
            <textarea
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              aria-label="Comment text"
              rows={3}
              placeholder="Add a simulated team comment..."
            />
            <button type="submit">
              <FiMessageCircle size={14} />
              Add Comment
            </button>
          </form>
        </div>

        <div className="demo-panel__card">
          <div className="demo-panel__tour-header">
            <div>
              <h2>Guided Editor Tour</h2>
              <p className="demo-panel__tour-copy">
                Launch a step-by-step walkthrough that opens the right panel for import, navigation, measuring,
                annotations, sharing, comments, and export.
              </p>
            </div>
            <button type="button" className="demo-panel__tour-launch" onClick={handleStartTour}>
              Start Tour
            </button>
          </div>

          <div className="demo-panel__tour-note">
            The same guided tour is also available from the editor top bar for authenticated users.
          </div>
        </div>
      </aside>
    </div>
  );
}
