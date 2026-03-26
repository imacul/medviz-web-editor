import { Suspense, lazy, useEffect, useMemo, useState, type ComponentType, type FormEvent } from 'react';
import { FiCheckCircle, FiCopy, FiMessageCircle } from 'react-icons/fi';
import { useNavigate, useSearchParams } from 'react-router';

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

type DemoCase = {
  id: string;
  title: string;
  summary: string;
  workflowFocus: string;
  modelUrl: string;
  fileName: string;
  starterComments: DemoComment[];
};

const Medical3DCanvas = lazy(loadMedical3DCanvas);

const Medical3DCanvasView = Medical3DCanvas as ComponentType<{
  initialModelSource?: ModelSource;
  onGoHome: () => void;
  readOnly?: boolean;
}>;

const DEMO_CASES: DemoCase[] = [
  {
    id: 'implant-planning',
    title: 'Sample Case 1: Implant Planning',
    summary: 'Anonymized implant-planning geometry for quick measurement and annotation testing.',
    workflowFocus: 'Measure distances, place markers, and export a PDF report.',
    modelUrl: '/demo-cases/implant-planning-case.obj',
    fileName: 'implant-planning-case.obj',
    starterComments: [
      {
        author: 'Lead Surgeon',
        text: 'Please verify implant path clearance before final review.',
        timestamp: '09:10',
      },
      {
        author: 'Implant Coordinator',
        text: 'Add marker near posterior ridge and include in report export.',
        timestamp: '09:14',
      },
    ],
  },
  {
    id: 'jaw-trauma',
    title: 'Sample Case 2: Jaw Trauma Reconstruction',
    summary: 'Anonymized fracture/reconstruction style geometry to test review and communication flow.',
    workflowFocus: 'Annotate fracture gap, check alignment, and share a link with your team.',
    modelUrl: '/demo-cases/jaw-trauma-reconstruction-case.obj',
    fileName: 'jaw-trauma-reconstruction-case.obj',
    starterComments: [
      {
        author: 'Trauma Surgeon',
        text: 'Mark segment offset before we align plate position.',
        timestamp: '10:03',
      },
    ],
  },
  {
    id: 'team-sharing',
    title: 'Sample Case 3: Team Sharing Workflow',
    summary: 'Anonymized collaboration case for simulating shared review and handoff comments.',
    workflowFocus: 'Create annotations, copy shareable link, and simulate cross-team feedback.',
    modelUrl: '/demo-cases/team-sharing-case.obj',
    fileName: 'team-sharing-case.obj',
    starterComments: [
      {
        author: 'Lab Technician',
        text: 'Ready for surgeon review. Please confirm highlighted zones.',
        timestamp: '11:22',
      },
      {
        author: 'Review Surgeon',
        text: 'Looks good so far. Add final note and export report PDF.',
        timestamp: '11:30',
      },
    ],
  },
];

const CASE_LOOKUP = new Map(DEMO_CASES.map((item) => [item.id, item]));

function getSafeCaseId(value: string | null) {
  if (!value) return DEMO_CASES[0].id;
  return CASE_LOOKUP.has(value) ? value : DEMO_CASES[0].id;
}

export default function DemoPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeCaseId, setActiveCaseId] = useState(() => getSafeCaseId(searchParams.get('case')));
  const [comments, setComments] = useState<DemoComment[]>(() => {
    const safe = getSafeCaseId(searchParams.get('case'));
    return [...(CASE_LOOKUP.get(safe)?.starterComments ?? [])];
  });
  const [author, setAuthor] = useState('Reviewer');
  const [commentText, setCommentText] = useState('');
  const [copied, setCopied] = useState(false);

  const activeCase = CASE_LOOKUP.get(activeCaseId) ?? DEMO_CASES[0];
  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return `https://www.medviz3d.com/demo?case=${activeCaseId}`;
    return `${window.location.origin}/demo?case=${activeCaseId}`;
  }, [activeCaseId]);

  const initialModelSource = useMemo<ModelSource>(
    () => ({
      kind: 'remote',
      url: activeCase.modelUrl,
      fileName: activeCase.fileName,
    }),
    [activeCase.fileName, activeCase.modelUrl]
  );

  useEffect(() => {
    document.body.classList.add('editor-mode');
    document.title = 'MedViz Free Demo - Instant Sample Cases';
    return () => {
      document.body.classList.remove('editor-mode');
    };
  }, []);

  useEffect(() => {
    const incoming = getSafeCaseId(searchParams.get('case'));
    if (incoming !== activeCaseId) {
      setActiveCaseId(incoming);
      setComments([...(CASE_LOOKUP.get(incoming)?.starterComments ?? [])]);
    }
  }, [activeCaseId, searchParams]);

  const chooseCase = (caseId: string) => {
    setActiveCaseId(caseId);
    setComments([...(CASE_LOOKUP.get(caseId)?.starterComments ?? [])]);
    setCopied(false);
    setSearchParams({ case: caseId }, { replace: true });
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
          initialModelSource={initialModelSource}
          onGoHome={() => navigate('/')}
          readOnly={false}
        />
      </Suspense>

      <aside className="demo-panel">
        <div className="demo-panel__card">
          <p className="demo-panel__eyebrow">Free Demo Mode</p>
          <h1>Try MedViz now. No signup required.</h1>
          <p className="demo-panel__sub">
            Pick a sample case and start reviewing immediately. Rotate, zoom, measure, annotate, export PDF, and
            simulate team collaboration in one browser session.
          </p>
        </div>

        <div className="demo-panel__card">
          <h2>Sample Cases</h2>
          <div className="demo-panel__cases">
            {DEMO_CASES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`demo-panel__case ${item.id === activeCaseId ? 'demo-panel__case--active' : ''}`}
                onClick={() => chooseCase(item.id)}
              >
                <strong>{item.title}</strong>
                <span>{item.summary}</span>
              </button>
            ))}
          </div>
          <p className="demo-panel__focus">
            <strong>Workflow focus:</strong> {activeCase.workflowFocus}
          </p>
        </div>

        <div className="demo-panel__card">
          <h2>Shareable Case Link (Simulated)</h2>
          <div className="demo-panel__share">
            <input value={shareUrl} readOnly aria-label="Shareable demo link" />
            <button type="button" onClick={copyShareUrl}>
              <FiCopy size={14} />
              {copied ? 'Copied' : 'Copy Link'}
            </button>
          </div>
        </div>

        <div className="demo-panel__card">
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
          <h2>Quick Action Checklist</h2>
          <ul className="demo-panel__checklist">
            <li>
              <FiCheckCircle size={14} />
              Rotate/zoom the 3D model
            </li>
            <li>
              <FiCheckCircle size={14} />
              Use Measure for distance checks
            </li>
            <li>
              <FiCheckCircle size={14} />
              Add annotations in Annotate mode
            </li>
            <li>
              <FiCheckCircle size={14} />
              Copy shareable case link
            </li>
            <li>
              <FiCheckCircle size={14} />
              Add a simulated team comment
            </li>
            <li>
              <FiCheckCircle size={14} />
              Export Report - PDF from the top bar
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
