import { useState, useEffect, useRef } from 'react';
import './LandingPage.css';
import logoSvg from '../assets/medviz-logo.svg';

// Feather icons
import {
  FiUploadCloud, FiScissors, FiMapPin, FiFileText,
  FiMove, FiRotateCcw, FiCamera, FiHeart,
  FiTool, FiUser, FiBook, FiMail,
} from 'react-icons/fi';
// Tabler icons (medical-specific)
import {
  TbRuler, TbBrush, TbBone, TbMicroscope,
} from 'react-icons/tb';

// Screenshots
import ss1 from '../screenshots/Screenshot 2026-02-07 183302.png';
import ss2 from '../screenshots/Screenshot 2026-02-07 183113.png';
import ss3 from '../screenshots/Screenshot 2026-02-07 183405.png';
import ss4 from '../screenshots/Screenshot 2026-02-07 125750.png';
import ss5 from '../screenshots/Screenshot 2026-02-07 104323.png';
import ss6 from '../screenshots/medviz-screenshot-1770463876250.png';

// ── Set your Tally form ID here, e.g. "wMdxK2" from https://tally.so/r/wMdxK2
const TALLY_FORM_ID = 'LZdLDz';

const FEATURES = [
  { Icon: FiUploadCloud, title: 'Multi-Format Import',     desc: 'Drag-and-drop STL, OBJ, or PLY files. Auto-normalised to scene scale. Metadata (triangles, vertices, bounding box) extracted instantly.' },
  { Icon: FiScissors,    title: 'Surgical Slicing',        desc: 'Slice through the mesh along X, Y, or Z axes. Apply clean planar cuts with smooth Sutherland–Hodgman edge clipping — no jagged geometry.' },
  { Icon: TbRuler,       title: 'Precision Measurements',  desc: 'Click two surface points to measure distance in millimetres. Labelled lines persist in the viewport and appear in exported screenshots.' },
  { Icon: FiMapPin,      title: 'Annotation Markers',      desc: 'Place named markers anywhere on the surface. Rename or delete them, then export the full set as JSON for downstream reporting pipelines.' },
  { Icon: TbBrush,       title: 'Segmentation Painting',   desc: 'Brush-paint anatomical regions in distinct colours. Vertex-level precision with GPU-interpolated smooth boundaries — even on coarse meshes.' },
  { Icon: FiFileText,    title: 'Clinical Report Export',  desc: 'One-click HTML report with embedded viewport screenshot, model metadata, measurements, and markers. Ready to attach to a patient file.' },
  { Icon: FiMove,        title: 'Transform & Align',       desc: 'Translate, rotate, and scale the mesh interactively. Reset to import pose at any time. Ideal for aligning bilateral models side-by-side.' },
  { Icon: FiRotateCcw,   title: 'Undo / Redo',             desc: 'Full undo/redo history for all trim and cut operations. Keyboard shortcuts (Ctrl+Z / Ctrl+Y) plus toolbar buttons.' },
  { Icon: FiCamera,      title: 'Viewport Screenshot',     desc: 'Export a high-resolution PNG of the current view, with optional overlay of measurements and annotation markers.' },
];

const STEPS = [
  { n: '01', title: 'Import Model',       desc: 'Drag-and-drop your STL, OBJ, or PLY file. Instant load with metadata summary.' },
  { n: '02', title: 'Inspect & Slice',    desc: 'Orbit the model, slice along any axis, and apply clean geometric cuts.' },
  { n: '03', title: 'Annotate & Measure', desc: 'Place markers, measure key distances, paint anatomical regions.' },
  { n: '04', title: 'Export Report',      desc: 'Generate an HTML case report or export the modified mesh as STL/OBJ.' },
];

const SCREENSHOTS = [
  { src: ss1, alt: 'Segmentation painting on foot model' },
  { src: ss2, alt: 'Slicing tool on 3D mesh' },
  { src: ss3, alt: 'Annotation markers on model' },
  { src: ss4, alt: 'Measurements and tool panel' },
  { src: ss5, alt: 'Full editor overview' },
  { src: ss6, alt: 'Export and rendering controls' },
];

const USE_CASES = [
  { Icon: TbBone,        title: 'Orthopaedics',            desc: 'Review bone scan meshes, measure deformity angles, and slice through anatomy for pre-op planning.' },
  { Icon: FiTool,        title: 'Prosthetics & Orthotics', desc: 'Inspect limb scans, segment soft tissue from bone, and mark socket fit reference points.' },
  { Icon: FiHeart,       title: 'Cardiovascular Surgery',  desc: 'Load vessel reconstructions, annotate pathology locations, and export findings for the surgical team.' },
  { Icon: FiUser,        title: 'Maxillofacial',           desc: 'Evaluate cranio-facial scan meshes with precise measurements and region colour-coding for treatment planning.' },
  { Icon: TbMicroscope,  title: 'Medical Research',        desc: 'Inspect segmented anatomy meshes from research scans without requiring specialist desktop software.' },
  { Icon: FiBook,        title: 'Clinical Education',      desc: 'Annotate and measure anatomy interactively for teaching — no software licences required for students.' },
];

// ── Scroll-reveal hook ──
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add('lp--visible'); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function RevealCard({ className, children }) {
  const ref = useReveal();
  return <div ref={ref} className={className}>{children}</div>;
}

export default function LandingPage({ onEnterEditor }) {
  const [lightboxSrc, setLightboxSrc] = useState(null);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setLightboxSrc(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Load Tally's embed script so it auto-resizes the iframe (removes inner scrollbar)
  useEffect(() => {
    if (!TALLY_FORM_ID) return;
    if (document.getElementById('tally-embed-js')) return;
    const s = document.createElement('script');
    s.id = 'tally-embed-js';
    s.src = 'https://tally.so/widgets/embed.js';
    s.async = true;
    document.body.appendChild(s);
    return () => { document.getElementById('tally-embed-js')?.remove(); };
  }, []);

  return (
    <div className="lp">
      <div className="lp__grid-bg" />

      {/* ── NAV ── */}
      <nav className="lp__nav">
        <div className="lp__nav-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <img src={logoSvg} alt="MedViz logo" />
          <span>Med<em>Viz</em></span>
        </div>
        <ul className="lp__nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#workflow">Workflow</a></li>
          <li><a href="#screenshots">Screenshots</a></li>
          <li><a href="#usecases">Use Cases</a></li>
          <li><a href="#feedback">Feedback</a></li>
        </ul>
        <button className="lp__btn lp__btn--primary" onClick={onEnterEditor}>
          Try it Free →
        </button>
      </nav>

      {/* ── HERO ── */}
      <section className="lp__hero" id="hero">
        <div className="lp__hero-glow" />

        <div className="lp__badge">
          <span className="lp__badge-dot" />
          Clinical 3D Editor · Browser-Based · No Install
        </div>

        <h1>
          Review 3D Medical Models<br />
          <span className="lp__highlight">Directly in Your Browser</span>
        </h1>

        <p className="lp__hero-sub">
          Import STL, OBJ, or PLY files, slice through anatomy, place measurement markers,
          annotate findings, and export a polished clinical report — all without installing anything.
        </p>

        <div className="lp__ctas">
          <button className="lp__btn lp__btn--primary lp__btn--lg" onClick={onEnterEditor}>
            Open the Editor →
          </button>
          <a className="lp__btn lp__btn--outline lp__btn--lg" href="#features">
            See Features
          </a>
        </div>

        <div className="lp__tags">
          {['STL / OBJ / PLY', 'Surgical Planning', 'Prosthetics & Orthotics',
            'Case Reporting', 'Orthopaedics', 'No Account Required'].map(t => (
            <span key={t}>{t}</span>
          ))}
        </div>

        <div className="lp__hero-screenshot">
          <div className="lp__browser-bar">
            <div className="lp__dot lp__dot--r" />
            <div className="lp__dot lp__dot--y" />
            <div className="lp__dot lp__dot--g" />
            <div className="lp__url-bar">MedViz · Clinical 3D Editor</div>
          </div>
          <img src={ss1} alt="MedViz editor showing 3D foot model with segmentation tools" />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="lp__features-bg">
        <div className="lp__inner">
          <p className="lp__label">Features</p>
          <h2 className="lp__title">Everything You Need for Clinical Mesh Review</h2>
          <p className="lp__sub">
            Built for speed and precision. Open a scan-derived mesh, interrogate it from every angle,
            mark your findings, and share a report — in minutes.
          </p>
          <div className="lp__features-grid">
            {FEATURES.map(({ Icon, title, desc }) => (
              <RevealCard key={title} className="lp__card">
                <div className="lp__card-icon"><Icon size={22} /></div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </RevealCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── WORKFLOW ── */}
      <section id="workflow" className="lp__workflow-bg">
        <div className="lp__inner">
          <p className="lp__label">Workflow</p>
          <h2 className="lp__title">From Import to Report in Four Steps</h2>
          <p className="lp__sub">
            MedViz is designed around the real clinical review workflow — fast and frictionless.
          </p>
          <div className="lp__steps">
            {STEPS.map(s => (
              <RevealCard key={s.n} className="lp__step">
                <div className="lp__step-num">{s.n}</div>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </RevealCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── SCREENSHOTS ── */}
      <section id="screenshots" className="lp__screenshots-bg">
        <div className="lp__inner">
          <p className="lp__label">Screenshots</p>
          <h2 className="lp__title">See It in Action</h2>
          <p className="lp__sub">
            Real captures from the MedViz editor — slicing, painting, measuring, and reporting.
          </p>
          <div className="lp__gallery">
            {SCREENSHOTS.map(s => (
              <RevealCard key={s.src} className="lp__gallery-item">
                <img
                  src={s.src}
                  alt={s.alt}
                  loading="lazy"
                  onClick={() => setLightboxSrc(s.src)}
                  style={{ cursor: 'pointer' }}
                />
              </RevealCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── USE CASES ── */}
      <section id="usecases" className="lp__usecases-bg">
        <div className="lp__inner">
          <p className="lp__label">Use Cases</p>
          <h2 className="lp__title">Built for Clinical Professionals</h2>
          <p className="lp__sub">
            MedViz fits naturally into review workflows across multiple clinical disciplines.
          </p>
          <div className="lp__uc-grid">
            {USE_CASES.map(({ Icon, title, desc }) => (
              <RevealCard key={title} className="lp__uc-card">
                <div className="lp__uc-icon"><Icon size={28} /></div>
                <h4>{title}</h4>
                <p>{desc}</p>
              </RevealCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BAND ── */}
      <section className="lp__cta-band">
        <div className="lp__cta-inner">
          <div>
            <h2>Start Reviewing Models Now</h2>
            <p>MedViz runs entirely in your browser. No account, no download, no data sent to any server. Your patient data stays on your machine.</p>
          </div>
          <button className="lp__cta-glow" onClick={onEnterEditor}>
            Open MedViz Editor →
          </button>
        </div>
      </section>

      {/* ── FEEDBACK ── */}
      <section id="feedback" className="lp__feedback-bg">
        <div className="lp__inner">
          <div className="lp__feedback-wrap">
            <p className="lp__label" style={{ textAlign: 'center' }}>Feedback</p>
            <h2 className="lp__title" style={{ maxWidth: '100%', textAlign: 'center' }}>
              Help Us Build the Right Tool
            </h2>
            <p className="lp__sub" style={{ maxWidth: '100%', textAlign: 'center', marginBottom: 0 }}>
              We are building MedViz for real clinical workflows.
              Tell us what you need, what is missing, or what gets in your way.
            </p>

            <div className="lp__tally">
              {TALLY_FORM_ID ? (
                <iframe
                  src={`https://tally.so/embed/${TALLY_FORM_ID}?hideTitle=1&transparentBackground=1&dynamicHeight=1`}
                  loading="lazy"
                  width="100%"
                  frameBorder="0"
                  title="MedViz Feedback"
                />
              ) : (
                <div className="lp__tally-ph">
                  <FiMail size={36} color="var(--cyan)" />
                  <p>Feedback form coming soon.</p>
                  <p>Set <code>TALLY_FORM_ID</code> in <code>src/LandingPage.jsx</code> to activate.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp__footer">
        <div className="lp__footer-brand">
          <img src={logoSvg} alt="MedViz logo" />
          <span>MedViz Web Editor</span>
        </div>
        <p>© 2026 MedViz. All rights reserved. Data never leaves your device.</p>
        <ul className="lp__footer-links">
          <li><button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Features</button></li>
          <li><button onClick={() => document.getElementById('feedback')?.scrollIntoView({ behavior: 'smooth' })}>Feedback</button></li>
          <li><button onClick={onEnterEditor}>Launch Editor</button></li>
        </ul>
      </footer>

      {/* ── LIGHTBOX ── */}
      {lightboxSrc && (
        <div
          className="lp__lightbox lp__lightbox--open"
          onClick={(e) => { if (e.target === e.currentTarget) setLightboxSrc(null); }}
        >
          <button className="lp__lightbox-close" onClick={() => setLightboxSrc(null)}>✕</button>
          <img src={lightboxSrc} alt="Screenshot preview" />
        </div>
      )}
    </div>
  );
}
