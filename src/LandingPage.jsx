import { useEffect, useRef, useState } from 'react';
import './LandingPage.css';
import logoSvg from '../assets/medviz-logo.svg';
import SiteHeader from './components/SiteHeader';

import {
  FiActivity,
  FiArrowRight,
  FiCamera,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiLock,
  FiMail,
  FiMapPin,
  FiMessageSquare,
  FiScissors,
  FiShield,
  FiUploadCloud,
  FiUsers,
} from 'react-icons/fi';
import { TbBone, TbBrandDatabricks, TbRuler, TbStethoscope } from 'react-icons/tb';

import ss1 from '../screenshots/Screenshot 2026-02-07 183302.png';
import ss2 from '../screenshots/Screenshot 2026-02-07 183113.png';
import ss3 from '../screenshots/Screenshot 2026-02-07 183405.png';
import ss4 from '../screenshots/Screenshot 2026-02-07 104323.png';
import ss5 from '../screenshots/Screenshot 2026-03-19 191802.png';
import ss6 from '../screenshots/Screenshot 2026-03-19 192014.png';

const TALLY_FORM_ID = 'LZdLDz';
const CONTACT_EMAIL = 'imacul77@gmail.com';

const OFFER_PILLARS = [
  {
    Icon: FiUploadCloud,
    title: '7-day pilot launch',
    desc: 'Go live quickly on one de-identified case without waiting for a heavy software rollout.',
  },
  {
    Icon: TbRuler,
    title: 'Measured review workflow',
    desc: 'Review anatomy with measurements, annotations, slices, saved views, and exportable findings.',
  },
  {
    Icon: FiShield,
    title: 'Private deployment',
    desc: 'Run a controlled pilot environment aligned to how your team already reviews maxillofacial cases.',
  },
  {
    Icon: FiFileText,
    title: 'Report-ready outputs',
    desc: 'Capture screenshots, notes, and measurements in a format your collaborators can review quickly.',
  },
];

const BUYERS = [
  {
    Icon: TbBone,
    title: 'Oral and maxillofacial clinics',
    desc: 'For teams that need a clearer way to review anatomy, discuss findings, and share complex 3D cases.',
  },
  {
    Icon: TbStethoscope,
    title: 'Dental implant and surgical centers',
    desc: 'For practices presenting implant, jaw, TMJ, trauma, and craniofacial cases across multiple stakeholders.',
  },
  {
    Icon: FiUsers,
    title: 'Training programs',
    desc: 'For departments that want reusable browser-based teaching and case presentation workflows for residents or fellows.',
  },
  {
    Icon: TbBrandDatabricks,
    title: 'Labs and collaborators',
    desc: 'For teams exchanging models with surgeons and needing a cleaner handoff than email attachments and static screenshots.',
  },
];

const PROCESS = [
  {
    n: '01',
    title: 'Book a 15-minute call',
    desc: 'We identify one review bottleneck to fix first and confirm pilot scope.',
  },
  {
    n: '02',
    title: 'Run one de-identified case',
    desc: 'We configure MedViz around one real workflow and your team validates it in practice.',
  },
  {
    n: '03',
    title: 'Launch private workspace',
    desc: 'Your team gets a working portal with review links, measurements, comments, and exports.',
  },
  {
    n: '04',
    title: 'Decide next step',
    desc: 'Review outcomes and choose to continue support, expand to more users, or request custom workflow work.',
  },
];

const PACKAGES = [
  {
    title: 'Pilot Sprint',
    price: '$1,000',
    cadence: '7-day launch sprint',
    support: '$149/month hosting and support after sprint',
    summary: 'Best for one team that needs a fast proof of workflow fit this month.',
    points: [
      '1 private workspace',
      'up to 5 users',
      'guided setup on one de-identified case',
      'measurements, annotations, slices, sharing, and report export',
    ],
  },
  {
    title: 'Clinic Rollout',
    price: '$2,000',
    cadence: 'one-time rollout setup',
    support: '$199/month hosting and support',
    summary: 'For clinics that want a more repeatable review workflow across a broader team.',
    points: [
      'private portal and branded review experience',
      'up to 15 users',
      'workflow tuning and onboarding call',
      'priority support during rollout',
    ],
  },
  {
    title: 'Custom Workflow',
    price: '$3,500+',
    cadence: 'custom scope',
    support: 'quoted per deployment',
    summary: 'For organizations that need deeper integrations, custom tooling, or white-label deployment.',
    points: [
      'custom reporting or white-labeling',
      'specialized review tools or workflow tailoring',
      'deeper onboarding and support',
      'scoped feature work on top of MedViz',
    ],
  },
];

const OUTCOMES = [
  'Launch one validated workflow in 7 days',
  'Reduce review friction across distributed teams',
  'Share findings without local software installs',
  'Expand only after measurable pilot outcomes',
];

const SCREENSHOTS = [
  { src: ss5, alt: 'MedViz mandible review overview in the browser' },
  { src: ss6, alt: 'MedViz skull review workflow with confirmed units and orientation' },
  { src: ss1, alt: 'MedViz model review canvas with segmentation paint tools' },
  { src: ss2, alt: 'MedViz slicing controls on a 3D model' },
  { src: ss3, alt: 'MedViz annotation markers on a review case' },
  { src: ss4, alt: 'MedViz editor workspace overview' },
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
      { threshold: 0.12 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return ref;
}

function RevealCard({ className, children }) {
  const ref = useReveal();
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openPilotEmail() {
  const subject = encodeURIComponent('MedViz Pilot Sprint Request ($1,000)');
  const body = encodeURIComponent(
    [
      'Hi Emmanuel,',
      '',
      "I'm interested in starting a MedViz Pilot Sprint for my team.",
      '',
      'Organization:',
      'Use case:',
      'Team size:',
      'Preferred start date:',
      'Urgency (this week / this month):',
      '',
      'Thanks,',
    ].join('\n')
  );

  window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
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

  const appAction = isAuthenticated ? onOpenDashboard : onLogin;
  const appActionLabel = isAuthenticated ? 'Open workspace' : 'See live app';

  return (
    <div className="lp">
      <div className="lp__grid-bg" />
      <div className="lp__noise" />

      <SiteHeader
        onBrandClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        items={[
          { label: 'Offer', href: '#offer' },
          { label: 'Pilot Flow', href: '#workflow' },
          { label: 'Pricing', href: '#pricing' },
          { label: 'See It', href: '#screenshots' },
          { label: 'Contact', href: '#feedback' },
        ]}
        actions={[
          { label: appActionLabel, onClick: appAction, variant: 'outline' },
          { label: 'Book 15-Min Call', onClick: openPilotEmail, variant: 'primary' },
        ]}
      />

      <section className="lp__hero" id="hero">
        <div className="lp__hero-glow" />
        <div className="lp__hero-grid">
          <div className="lp__hero-copy">
            <div className="lp__badge">
              <span className="lp__badge-dot" />
              2 pilot slots open this month for oral and maxillofacial teams
            </div>

            <h1>
              Launch Your Team's
              <br />
              <span className="lp__highlight">Private 3D Review Workflow in 7 Days</span>
            </h1>

            <p className="lp__hero-sub">
              MedViz helps oral and maxillofacial teams review, measure, annotate, and share complex
              3D cases in the browser without local software installs. Start with one paid pilot sprint,
              then expand after clear workflow results.
            </p>

            <div className="lp__ctas">
              <button className="lp__btn lp__btn--primary lp__btn--lg" onClick={openPilotEmail}>
                Book 15-Min Workflow Call
                <FiArrowRight size={16} />
              </button>
              <button className="lp__btn lp__btn--outline lp__btn--lg" onClick={() => scrollToSection('pricing')}>
                Start at $1,000
              </button>
              <button className="lp__btn lp__btn--ghost lp__btn--lg" onClick={appAction}>
                {appActionLabel}
              </button>
            </div>

            <div className="lp__tags">
              {[
                '7-day pilot sprint',
                'Starts at $1,000',
                'No local software installs',
                'Annotations and measurements',
                'Case sharing links',
                'Exportable review reports',
                'Built for OMFS teams',
              ].map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>

            <div className="lp__outcome-strip">
              {OUTCOMES.map((item) => (
                <div key={item} className="lp__outcome-item">
                  <FiCheckCircle size={15} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lp__hero-surface">
            <div className="lp__browser-bar">
              <div className="lp__dot lp__dot--r" />
              <div className="lp__dot lp__dot--y" />
              <div className="lp__dot lp__dot--g" />
              <div className="lp__url-bar">www.medviz3d.com / private review portal</div>
            </div>
            <img src={ss5} alt="MedViz editor showing a mandible review workflow" />
            <div className="lp__surface-card lp__surface-card--top">
              <FiLock size={16} />
              <div>
                <strong>Private pilot setup</strong>
                <span>Configured for a real team workflow</span>
              </div>
            </div>
            <div className="lp__surface-card lp__surface-card--bottom">
              <FiClock size={16} />
              <div>
                <strong>Fast to evaluate</strong>
                <span>Start with a de-identified case and tighten from there</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="lp__signal-band">
        <div className="lp__signal-grid">
          <div>
            <p className="lp__signal-kicker">Why Teams Buy MedViz</p>
            <h2>Faster case review, clearer communication, and lower rollout friction.</h2>
          </div>
          <p>
            Instead of forcing a full software migration, teams start with one paid sprint, validate
            workflow value, and expand only when results are clear.
          </p>
        </div>
      </section>

      <section id="offer" className="lp__features-bg">
        <div className="lp__inner">
          <p className="lp__label">Offer</p>
          <h2 className="lp__title">What the $1,000 Pilot Sprint includes</h2>
          <p className="lp__sub">
            Start with one focused setup built around a real workflow bottleneck and validate value fast.
          </p>
          <div className="lp__features-grid">
            {OFFER_PILLARS.map(({ Icon, title, desc }) => (
              <RevealCard key={title} className="lp__card">
                <div className="lp__card-icon">
                  <Icon size={22} />
                </div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </RevealCard>
            ))}
          </div>
        </div>
      </section>

      <section id="buyers" className="lp__buyers-bg">
        <div className="lp__inner">
          <p className="lp__label">Who It Is For</p>
          <h2 className="lp__title">Who MedViz fits best</h2>
          <p className="lp__sub">
            MedViz fits teams that regularly review complex 3D cases and need a clearer way to coordinate discussion, findings, and follow-up.
          </p>
          <div className="lp__buyers-grid">
            {BUYERS.map(({ Icon, title, desc }) => (
              <RevealCard key={title} className="lp__buyer-card">
                <div className="lp__buyer-icon">
                  <Icon size={24} />
                </div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </RevealCard>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="lp__workflow-bg">
        <div className="lp__inner">
          <p className="lp__label">Pilot Flow</p>
          <h2 className="lp__title">How the 7-day pilot sprint works</h2>
          <p className="lp__sub">
            Keep rollout focused and measurable so your team can decide quickly.
          </p>
          <div className="lp__steps">
            {PROCESS.map((step) => (
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
          <p>
            MedViz supports orientation confirmation, unit confirmation, annotations, sharing, and report export so
            the workflow is easier to trust during early pilot use.
          </p>
        </div>
      </section>

      <section id="pricing" className="lp__pricing-bg">
        <div className="lp__inner">
          <p className="lp__label">Pricing</p>
          <h2 className="lp__title">Choose your pilot scope</h2>
          <p className="lp__sub">
            Most teams start with Pilot Sprint, prove fit on one case workflow, then expand.
          </p>
          <div className="lp__pricing-grid">
            {PACKAGES.map((pkg) => (
              <RevealCard key={pkg.title} className="lp__price-card">
                <div className="lp__price-top">
                  <p className="lp__price-title">{pkg.title}</p>
                  <div className="lp__price-line">
                    <span className="lp__price-value">{pkg.price}</span>
                    <span className="lp__price-cadence">{pkg.cadence}</span>
                  </div>
                  <p className="lp__price-support">{pkg.support}</p>
                </div>
                <p className="lp__price-summary">{pkg.summary}</p>
                <ul className="lp__price-points">
                  {pkg.points.map((point) => (
                    <li key={point}>
                      <FiCheckCircle size={15} />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <button className="lp__btn lp__btn--primary lp__btn--full" onClick={openPilotEmail}>
                  Book {pkg.title}
                </button>
              </RevealCard>
            ))}
          </div>
        </div>
      </section>

      <section id="screenshots" className="lp__screenshots-bg">
        <div className="lp__inner">
          <p className="lp__label">See It In Use</p>
          <h2 className="lp__title">See the review workflow before you commit</h2>
          <p className="lp__sub">
            You do not have to imagine the workflow from scratch. You can see the product, review the interface, and evaluate fit before starting a pilot.
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

      <section className="lp__service-band">
        <div className="lp__service-copy">
          <p className="lp__label">Need Something More Custom?</p>
              <h2 className="lp__title">Clinics use MedViz as a core platform, then tailor it to match local workflow.</h2>
              <p className="lp__sub">
                Common customizations include branded portals, tailored reporting, specialty review controls, onboarding
                support, and workflow tuning around how teams actually review cases.
              </p>
        </div>
        <div className="lp__service-list">
          {[
            'Private branded review portals',
            'Workflow tuning for surgeons, coordinators, and labs',
            'Case presentation and reporting support',
            'Custom feature work on top of the MedViz core',
          ].map((item) => (
            <div key={item} className="lp__service-item">
              <FiActivity size={17} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="lp__cta-band">
        <div className="lp__cta-inner">
          <div>
            <h2>Need this live before month-end?</h2>
            <p>
              Book a short call, launch one private pilot sprint, and decide with real workflow feedback.
            </p>
          </div>
          <div className="lp__cta-stack">
            <button className="lp__cta-glow" onClick={openPilotEmail}>
              Claim a Pilot Slot
            </button>
            <button className="lp__cta-plain" onClick={appAction}>
              {appActionLabel}
            </button>
          </div>
        </div>
      </section>

      <section id="feedback" className="lp__feedback-bg">
        <div className="lp__inner">
          <div className="lp__feedback-wrap">
            <p className="lp__label" style={{ textAlign: 'center' }}>Contact</p>
            <h2 className="lp__title" style={{ maxWidth: '100%', textAlign: 'center' }}>
              Book a 15-Min Pilot Fit Call
            </h2>
            <p className="lp__sub" style={{ maxWidth: '100%', textAlign: 'center', marginBottom: 0 }}>
              Use the form below to lock a pilot slot, discuss workflow fit, and get started fast.
            </p>

            <div className="lp__contact-actions">
              <button className="lp__btn lp__btn--primary" onClick={openPilotEmail}>
                <FiMail size={16} />
                Request Pilot Call
              </button>
              <button className="lp__btn lp__btn--outline" onClick={() => scrollToSection('screenshots')}>
                <FiCamera size={16} />
                Review product screenshots
              </button>
            </div>

            <div className="lp__tally">
              {TALLY_FORM_ID ? (
                <iframe
                  src={`https://tally.so/embed/${TALLY_FORM_ID}?hideTitle=1&transparentBackground=1&dynamicHeight=1`}
                  loading="lazy"
                  width="100%"
                  frameBorder="0"
                  title="MedViz contact form"
                />
              ) : (
                <div className="lp__tally-ph">
                  <FiMessageSquare size={36} color="var(--cyan)" />
                  <p>Contact form coming soon.</p>
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
        <p>(c) {currentYear} MedViz. Private 3D case review pilots for clinical teams.</p>
        <ul className="lp__footer-links">
          <li>
            <button onClick={() => scrollToSection('offer')}>Offer</button>
          </li>
          <li>
            <button onClick={() => scrollToSection('pricing')}>Pricing</button>
          </li>
          <li>
            <button onClick={openPilotEmail}>Book Call</button>
          </li>
        </ul>
      </footer>

      {lightboxSrc && (
        <div
          className="lp__lightbox lp__lightbox--open"
          onClick={(event) => {
            if (event.target === event.currentTarget) setLightboxSrc(null);
          }}
        >
          <button className="lp__lightbox-close" onClick={() => setLightboxSrc(null)}>
            x
          </button>
          <img src={lightboxSrc} alt="Screenshot preview" />
        </div>
      )}
    </div>
  );
}
