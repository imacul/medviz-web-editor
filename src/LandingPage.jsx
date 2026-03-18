import { useEffect, useRef, useState } from 'react';
import './LandingPage.css';
import logoSvg from '../assets/medviz-logo.svg';
import SiteHeader from './components/SiteHeader';

import {
  FiUploadCloud,
  FiScissors,
  FiMapPin,
  FiFileText,
  FiMove,
  FiRotateCcw,
  FiCamera,
  FiHeart,
  FiTool,
  FiUser,
  FiBook,
  FiMail,
  FiLock,
} from 'react-icons/fi';
import { TbRuler, TbBrush, TbBone, TbMicroscope } from 'react-icons/tb';

import ss1 from '../screenshots/Screenshot 2026-02-07 183302.png';
import ss2 from '../screenshots/Screenshot 2026-02-07 183113.png';
import ss3 from '../screenshots/Screenshot 2026-02-07 183405.png';
import ss4 from '../screenshots/Screenshot 2026-02-07 125750.png';
import ss5 from '../screenshots/Screenshot 2026-02-07 104323.png';
import ss6 from '../screenshots/medviz-screenshot-1770463876250.png';

const TALLY_FORM_ID = 'LZdLDz';

const FEATURES = [
  { Icon: FiUploadCloud, title: 'Open Patient Model', desc: 'Load the patient model and begin your review in seconds — no conversion or preparation needed.' },
  { Icon: FiScissors, title: 'Slice Anatomy', desc: 'Cut through the model to expose internal anatomy and see what lies beneath the surface.' },
  { Icon: TbRuler, title: 'Measure Anatomy', desc: 'Measure between points on the model and keep values visible throughout the review.' },
  { Icon: FiMapPin, title: 'Annotate Findings', desc: 'Place markers on the model to note landmarks, findings, or next steps.' },
  { Icon: TbBrush, title: 'Highlight Regions', desc: 'Colour regions of interest so the area under review stands out clearly.' },
  { Icon: FiFileText, title: 'Generate Report', desc: 'Export a PDF or HTML report with screenshots, measurements, and your case notes — ready to share with your team.' },
  { Icon: FiMove, title: 'Reposition Model', desc: 'Move, rotate, and scale the patient model to match the view you need.' },
  { Icon: FiRotateCcw, title: 'Undo Changes', desc: 'Step backward or forward through recent edits without losing your place.' },
  { Icon: FiCamera, title: 'Capture View', desc: 'Save a clean image of the current view for discussion or documentation.' },
];

const STEPS = [
  { n: '01', title: 'Create a Case', desc: 'Add a case name and short notes to keep your review organised.' },
  { n: '02', title: 'Import the Model', desc: 'Load the patient STL, OBJ, or PLY file directly into the 3D workspace.' },
  { n: '03', title: 'Review and Annotate', desc: 'Measure anatomy, slice cross-sections, highlight regions, and note your findings.' },
  { n: '04', title: 'Share or Return', desc: 'Export a report for your team, or come back to the case anytime and continue.' },
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
  { Icon: TbBone, title: 'Orthopaedics', desc: 'Review skeletal anatomy, measure deformity, and prepare for planning discussions.' },
  { Icon: FiTool, title: 'Prosthetics and Orthotics', desc: 'Inspect limb models, highlight regions of interest, and compare follow-up reviews.' },
  { Icon: FiHeart, title: 'Cardiovascular Surgery', desc: 'Revisit vascular models and continue reviewing findings when needed.' },
  { Icon: FiUser, title: 'Maxillofacial', desc: 'Work through craniofacial cases with measurements, markers, and notes.' },
  { Icon: TbMicroscope, title: 'Medical Research', desc: 'Keep study models in one browser-based review space.' },
  { Icon: FiBook, title: 'Clinical Education', desc: 'Build teaching cases that can be reopened for future discussion and training.' },
];

function useReveal() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.classList.add('lp--visible');
      },
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

export default function LandingPage({
  onEnterEditor,
  onOpenDashboard,
  onLogin,
  onSignup,
  isAuthenticated = false,
}) {
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const handler = (event) => {
      if (event.key === 'Escape') setLightboxSrc(null);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!TALLY_FORM_ID) return;
    if (document.getElementById('tally-embed-js')) return;

    const script = document.createElement('script');
    script.id = 'tally-embed-js';
    script.src = 'https://tally.so/widgets/embed.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.getElementById('tally-embed-js')?.remove();
    };
  }, []);

  const primaryAction = isAuthenticated ? onOpenDashboard : onLogin;
  const primaryLabel = isAuthenticated ? 'Open Cases ->' : 'Start Review ->';
  const secondaryAction = isAuthenticated ? onEnterEditor : onSignup;
  const secondaryLabel = isAuthenticated ? 'Start New Case' : 'Create Access';

  return (
    <div className="lp">
      <div className="lp__grid-bg" />

      <SiteHeader
        onBrandClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        items={[
          { label: 'Review Tools', href: '#features' },
          { label: 'Case Flow', href: '#workflow' },
          { label: 'See It In Use', href: '#screenshots' },
          { label: 'Specialties', href: '#usecases' },
          { label: 'Feedback', href: '#feedback' },
        ]}
        actions={[
          ...(!isAuthenticated ? [{ label: 'Create Access', onClick: onSignup, variant: 'outline' }] : []),
          { label: primaryLabel, onClick: primaryAction, variant: 'primary' },
        ]}
      />

      <section className="lp__hero" id="hero">
        <div className="lp__hero-glow" />

        <div className="lp__badge">
          <span className="lp__badge-dot" />
          For Surgical Teams · No Software to Install
        </div>

        <h1>
          See Your Patient's Anatomy
          <br />
          <span className="lp__highlight">Before You Operate</span>
        </h1>

        <p className="lp__hero-sub">
          Browser-based 3D case review for surgical teams and clinical practitioners. No software to install — measure, annotate, and report in minutes.
        </p>

        <div className="lp__ctas">
          <button className="lp__btn lp__btn--primary lp__btn--lg" onClick={primaryAction}>
            {isAuthenticated ? 'Open Cases ->' : 'Start Review ->'}
          </button>
          <button className="lp__btn lp__btn--outline lp__btn--lg" onClick={secondaryAction}>
            {secondaryLabel}
          </button>
        </div>

        <div className="lp__tags">
          {[
            'No Software to Install',
            'Works in Any Browser',
            'Patient Files Stay Private',
            'Measure Anatomy',
            'Annotate Findings',
            'Generate Reports',
            'Built for Surgical Teams',
          ].map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>

        <div className="lp__hero-screenshot">
          <div className="lp__browser-bar">
            <div className="lp__dot lp__dot--r" />
            <div className="lp__dot lp__dot--y" />
            <div className="lp__dot lp__dot--g" />
            <div className="lp__url-bar">MedViz / Clinical 3D Workspace</div>
          </div>
          <img src={ss1} alt="MedViz editor showing 3D foot model with segmentation tools" />
        </div>
      </section>

      <section id="features" className="lp__features-bg">
        <div className="lp__inner">
          <p className="lp__label">Features</p>
          <h2 className="lp__title">Everything you need for 3D case review</h2>
          <p className="lp__sub">
            One workspace for the whole review — from opening the model to sharing findings with your team.
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

      <section id="workflow" className="lp__workflow-bg">
        <div className="lp__inner">
          <p className="lp__label">Workflow</p>
          <h2 className="lp__title">How a review works</h2>
          <p className="lp__sub">
            From model import to report — everything your team needs in one place.
          </p>
          <div className="lp__steps">
            {STEPS.map((step) => (
              <RevealCard key={step.n} className="lp__step">
                <div className="lp__step-num">{step.n}</div>
                <h4>{step.title}</h4>
                <p>{step.desc}</p>
              </RevealCard>
            ))}
          </div>
        </div>
      </section>

      <section className="lp__trust-band">
        <div className="lp__trust-inner">
          <FiLock size={16} color="var(--green)" style={{ flexShrink: 0 }} />
          <p>Choose where your cases are stored — browser only or cloud sync — from your account settings. You stay in control.</p>
        </div>
      </section>

      <section id="screenshots" className="lp__screenshots-bg">
        <div className="lp__inner">
          <p className="lp__label">Screenshots</p>
          <h2 className="lp__title">See the editor in action</h2>
          <p className="lp__sub">
            Real captures from MedViz in use.
          </p>
          <div className="lp__gallery">
            {SCREENSHOTS.map((shot) => (
              <RevealCard key={shot.src} className="lp__gallery-item">
                <img
                  src={shot.src}
                  alt={shot.alt}
                  loading="lazy"
                  onClick={() => setLightboxSrc(shot.src)}
                  style={{ cursor: 'pointer' }}
                />
              </RevealCard>
            ))}
          </div>
        </div>
      </section>

      <section id="usecases" className="lp__usecases-bg">
        <div className="lp__inner">
          <p className="lp__label">Use Cases</p>
          <h2 className="lp__title">Built for surgical teams</h2>
          <p className="lp__sub">
            Useful wherever 3D anatomy review, measurement, and clinical discussion matter.
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

      <section className="lp__cta-band">
        <div className="lp__cta-inner">
          <div>
            <h2>Ready to Review Your First Case?</h2>
            <p>
              No software to download. Works in any modern browser. Your files stay on your device.
            </p>
          </div>
          <button className="lp__cta-glow" onClick={isAuthenticated ? onOpenDashboard : onSignup}>
            {isAuthenticated ? 'Open Cases ->' : 'Create Access ->'}
          </button>
        </div>
      </section>

      <section id="feedback" className="lp__feedback-bg">
        <div className="lp__inner">
          <div className="lp__feedback-wrap">
            <p className="lp__label" style={{ textAlign: 'center' }}>Feedback</p>
            <h2 className="lp__title" style={{ maxWidth: '100%', textAlign: 'center' }}>
              Help Us Build the Right Tool
            </h2>
            <p className="lp__sub" style={{ maxWidth: '100%', textAlign: 'center', marginBottom: 0 }}>
              Tell us what helps your review process, what feels unclear, and what would make MedViz more useful in practice.
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
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="lp__footer">
        <div className="lp__footer-brand">
          <img src={logoSvg} alt="MedViz logo" />
          <span>MedViz</span>
        </div>
        <p>(c) {currentYear} MedViz. Built for clinical 3D review.</p>
        <ul className="lp__footer-links">
          <li><button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Review Tools</button></li>
          <li><button onClick={() => document.getElementById('feedback')?.scrollIntoView({ behavior: 'smooth' })}>Feedback</button></li>
          <li><button onClick={isAuthenticated ? onOpenDashboard : onLogin}>{isAuthenticated ? 'Cases' : 'Start Review'}</button></li>
        </ul>
      </footer>

      {lightboxSrc && (
        <div
          className="lp__lightbox lp__lightbox--open"
          onClick={(event) => {
            if (event.target === event.currentTarget) setLightboxSrc(null);
          }}
        >
          <button className="lp__lightbox-close" onClick={() => setLightboxSrc(null)}>x</button>
          <img src={lightboxSrc} alt="Screenshot preview" />
        </div>
      )}
    </div>
  );
}
