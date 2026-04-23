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
  FiMessageSquare,
  FiPlay,
  FiScissors,
  FiShield,
  FiUploadCloud,
  FiUsers,
} from 'react-icons/fi';
import { TbBone, TbBrandDatabricks, TbRuler, TbStethoscope } from 'react-icons/tb';
import { appendSource, trackEvent } from './lib/analytics';

import ss1 from '../screenshots/Screenshot 2026-02-07 183302 - optimized.jpg';
import ss2 from '../screenshots/Screenshot 2026-02-07 183113 - optimized.jpg';
import ss3 from '../screenshots/Screenshot 2026-02-07 183405 - optimized.jpg';
import ss4 from '../screenshots/Screenshot 2026-02-07 104323 - optimized.jpg';
import ss5 from '../screenshots/Screenshot 2026-03-19 191802 - optimized.jpg';
import ss6 from '../screenshots/Screenshot 2026-03-19 192014 - optimized.jpg';
import walkthroughVideo from '../assets/medviz3D.mp4';

const TALLY_FORM_ID = 'LZdLDz';
const CONTACT_EMAIL = 'hello@medviz3d.com';
const POLICY_PAGE_PATH = '/business-profile-refund-policy';
const DEMO_PAGE_PATH = '/demo';

const OFFER_PILLARS = [
  {
    Icon: FiUploadCloud,
    title: '7-day pilot launch',
    desc: 'Go live on one de-identified case quickly without waiting for a heavy software rollout.',
  },
  {
    Icon: TbRuler,
    title: 'Measured review workflow',
    desc: 'Review anatomy with measurements, annotations, slices, saved views, and exportable findings in one browser flow.',
  },
  {
    Icon: FiShield,
    title: 'Private deployment',
    desc: 'Run a controlled pilot environment aligned to your current oral surgery and implant case-review workflow.',
  },
  {
    Icon: FiFileText,
    title: 'Report-ready outputs',
    desc: 'Capture screenshots, notes, and measurements in a format collaborators can review and approve quickly.',
  },
];

const BUYERS = [
  {
    Icon: TbBone,
    title: 'Oral and maxillofacial surgery clinics',
    desc: 'For teams that need a clearer way to review anatomy, align plans, and present complex 3D cases.',
  },
  {
    Icon: TbStethoscope,
    title: 'Dental implant and surgical centers',
    desc: 'For practices managing implant, jaw, TMJ, trauma, and craniofacial workflows across multiple stakeholders.',
  },
  {
    Icon: FiUsers,
    title: 'Training programs',
    desc: 'For departments that want reusable browser-based teaching and 3D case presentation workflows for residents or fellows.',
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
    title: 'Share one workflow need',
    desc: 'Tell us the bottleneck by email and get an async setup recommendation.',
  },
  {
    n: '02',
    title: 'Run one de-identified case',
    desc: 'We configure MedViz around one real workflow so your team can validate fit in practice.',
  },
  {
    n: '03',
    title: 'Launch private workspace',
    desc: 'Your team gets a working portal with secure review links, measurements, comments, and exports.',
  },
  {
    n: '04',
    title: 'Decide next step',
    desc: 'Review outcomes and choose to continue support, expand users, or request custom workflow features.',
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
      'workflow tuning and async onboarding support',
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
  'Review a de-identified case in minutes instead of trading screenshots and calls',
  'Capture findings with measurements, comments, and report-ready outputs in one browser flow',
  'Share the same case view with your team without asking anyone to install local software',
  'Create access only when you want to save work, reopen later, and coordinate across cases',
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

function ProgressiveImage({
  src,
  alt,
  className,
  eager = false,
  fetchPriority,
  onClick,
}) {
  const frameRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(eager);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (shouldLoad) return;

    const node = frameRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShouldLoad(true);
        observer.disconnect();
      },
      { rootMargin: '280px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    <div
      ref={frameRef}
      className={`lp__progressive-image${isLoaded ? ' lp__progressive-image--loaded' : ''}${className ? ` ${className}` : ''}`}
    >
      <div className="lp__progressive-image__placeholder" aria-hidden="true" />
      {shouldLoad ? (
        <img
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={fetchPriority}
          onLoad={() => setIsLoaded(true)}
          onClick={onClick}
          style={onClick ? { cursor: 'pointer' } : undefined}
        />
      ) : null}
    </div>
  );
}

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openWalkthrough(source = 'landing_walkthrough') {
  trackEvent('cta_click', { target: 'walkthrough', source });
  scrollToSection('walkthrough');
}

function openPilotEmail(source = 'landing_email') {
  trackEvent('cta_click', { target: 'email', source });
  const subject = encodeURIComponent('MedViz Custom Setup Request');
  const body = encodeURIComponent(
    [
      'Hi Emmanuel,',
      '',
      "I'm interested in custom MedViz setup support for my team.",
      '',
      'Organization:',
      'Use case:',
      'Team size:',
      'Current workflow challenge:',
      'Preferred timeline (optional):',
      '',
      'Thanks,',
    ].join('\n')
  );

  window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}

function openPolicyPage() {
  trackEvent('cta_click', { target: 'policy', source: 'landing_policy' });
  window.location.href = POLICY_PAGE_PATH;
}

function openFreeDemo(source = 'landing_demo') {
  trackEvent('cta_click', { target: 'demo', source });
  window.location.href = appendSource(DEMO_PAGE_PATH, source);
}

export default function LandingPage({
  onEnterEditor,
  onOpenDashboard,
  onLogin,
  onSignup,
  isAuthenticated = false,
}) {
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [heroPromptVisible, setHeroPromptVisible] = useState(false);
  const currentYear = new Date().getFullYear();
  const headerActions = isAuthenticated
    ? [
        {
          label: 'Dashboard',
          onClick: () => onOpenDashboard?.('landing_header_dashboard'),
          variant: 'outline',
        },
        {
          label: 'Open Workspace',
          onClick: () => onEnterEditor?.('landing_header_workspace'),
          variant: 'primary',
        },
      ]
    : [
        { label: 'Log in', onClick: () => onLogin?.('landing_header_login'), variant: 'outline' },
        { label: 'Sign up', onClick: () => onSignup?.('landing_header_signup'), variant: 'primary' },
      ];

  useEffect(() => {
    const handler = (event) => {
      if (event.key === 'Escape') setLightboxSrc(null);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setHeroPromptVisible(true);
    }, 2600);

    return () => {
      window.clearTimeout(timerId);
    };
  }, []);

  return (
    <div className="lp">
      <div className="lp__grid-bg" />
      <div className="lp__noise" />

      <SiteHeader
        onBrandClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        items={[
          { label: 'Free Demo', href: appendSource('/demo', 'header_nav') },
          { label: 'Blog', href: appendSource('/blog', 'landing_header_blog') },
          { label: 'Offer', href: '#offer' },
          { label: 'Pilot Flow', href: '#workflow' },
          { label: 'Pricing', href: '#pricing' },
          { label: 'See It', href: '#screenshots' },
          { label: 'Contact', href: '#feedback' },
        ]}
        actions={headerActions}
      />

      <section className="lp__hero lp__hero--immersive" id="hero">
        <div className="lp__hero-backdrop" aria-hidden="true">
          <video
            className="lp__hero-bg-video"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={ss6}
          >
            <source src={`${walkthroughVideo}#t=0,90`} type="video/mp4" />
          </video>
          <div className="lp__hero-backdrop-grid" />
          <div className="lp__hero-backdrop-scrim" />
        </div>
        <div className="lp__hero-glow" />
        <div className="lp__hero-frame">
          <div className="lp__hero-grid">
            <div className="lp__hero-copy lp__hero-copy-shell">
            <div className="lp__badge">
              <span className="lp__badge-dot" />
              Free access live now - no signup, no call needed
            </div>

            <h1>
              Move from model import to <span className="lp__highlight">clearer treatment decisions faster</span>
            </h1>

            <p className="lp__hero-sub">
              Review a 3D case in the browser, mark the anatomy that matters, and leave the meeting with a
              shareable record of the decision. Start free with sample cases or your own de-identified model.
            </p>

            <div className="lp__ctas">
              <button className="lp__btn lp__btn--free lp__btn--lg" onClick={() => openFreeDemo('hero_primary')}>
                Review a Case Free Now
                <FiArrowRight size={16} />
              </button>
              <button className="lp__btn lp__btn--outline lp__btn--lg" onClick={() => openWalkthrough('hero_walkthrough')}>
                <FiPlay size={15} />
                Watch the 60-sec workflow
              </button>
              <button className="lp__btn lp__btn--ghost lp__btn--lg" onClick={() => openPilotEmail('hero_email')}>
                Need rollout help? Email us
              </button>
            </div>

            <div className="lp__tags">
              {[
                'Free instant demo',
                'No signup required',
                'No call required',
                '3D case review software',
                'No local software installs',
                'Annotations and measurements',
                'Case sharing links',
                'Exportable review reports',
                'Optional paid custom pilot',
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

          </div>
        </div>
      </section>

      <section className="lp__signal-band">
        <div className="lp__signal-grid">
          <div>
          <p className="lp__signal-kicker">Why Teams Buy MedViz</p>
          <h2>Try first for free, then pay only if you need custom rollout support.</h2>
        </div>
        <p>
            Teams can self-test with instant sample cases before any sales call. Guided pilots remain available
            for organizations that want custom setup and onboarding.
        </p>
      </div>
    </section>

      <section id="walkthrough" className="lp__walkthrough-bg">
        <div className="lp__inner">
          <p className="lp__label">Workflow Video</p>
          <h2 className="lp__title">See how teams review, comment, and leave with a documented decision</h2>
          <p className="lp__sub">
            This walkthrough shows the full outcome: open a case, measure what matters, add comments, share the
            same view, and export what the team decided.
          </p>
          <div className="lp__walkthrough-wrap">
            <video controls preload="metadata" playsInline poster={ss6}>
              <source src={`${walkthroughVideo}#t=0,90`} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
          <div className="lp__walkthrough-actions">
            <button className="lp__btn lp__btn--free" onClick={() => openFreeDemo('walkthrough_cta')}>
              Review a Case Free Now
            </button>
            <button className="lp__btn lp__btn--outline" onClick={() => openPilotEmail('walkthrough_email')}>
              Need custom setup? Send details by email
            </button>
          </div>
        </div>
      </section>

      <section id="offer" className="lp__features-bg">
        <div className="lp__inner">
          <p className="lp__label">Offer</p>
          <h2 className="lp__title">Optional guided pilot if you want custom setup</h2>
          <p className="lp__sub">
            Use free demo mode first. If your team wants implementation support, choose a guided pilot.
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
            MedViz fits teams that regularly review complex 3D cases and need a clearer way to coordinate planning, findings, and follow-up.
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
            your team can trust early pilot decisions.
          </p>
        </div>
      </section>

      <section id="pricing" className="lp__pricing-bg">
        <div className="lp__inner">
          <p className="lp__label">Pricing</p>
          <h2 className="lp__title">Choose your pilot scope</h2>
          <p className="lp__sub">
            Most teams start with Pilot Sprint, prove fit on one high-value case workflow, then expand.
          </p>
          <div className="lp__pricing-grid">
            {PACKAGES.map((pkg) => (
              <RevealCard key={pkg.title} className="lp__price-card">
                <div className="lp__price-top">
                  <p className="lp__price-title">{pkg.title}</p>
                  <div className="lp__price-line">
                    <span className="lp__price-cadence">{pkg.cadence}</span>
                  </div>
                  <p className="lp__price-support">Pricing shared on request</p>
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
                <button
                  className="lp__btn lp__btn--primary lp__btn--full"
                  onClick={() => openPilotEmail(`pricing_${pkg.title.toLowerCase().replace(/\s+/g, '_')}`)}
                >
                  Request {pkg.title}
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
                <ProgressiveImage
                  src={shot.src}
                  alt={shot.alt}
                  className="lp__gallery-image"
                  fetchPriority="low"
                  onClick={() => setLightboxSrc(shot.src)}
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
            <h2>Turn one case review into a clearer team decision</h2>
            <p>
              Open the demo, review a case, and see the outcome for yourself. When you want to save work,
              reopen later, or roll this out across the team, create access or email for setup help.
            </p>
          </div>
          <div className="lp__cta-stack">
            <button className="lp__cta-glow" onClick={() => openFreeDemo('bottom_cta')}>
              Review a Case Free Now
            </button>
            <button className="lp__cta-plain" onClick={() => openPilotEmail('bottom_email')}>
              Email for custom rollout
            </button>
          </div>
        </div>
      </section>

      <section id="feedback" className="lp__feedback-bg">
        <div className="lp__inner">
          <div className="lp__feedback-wrap">
            <p className="lp__label" style={{ textAlign: 'center' }}>Contact</p>
            <h2 className="lp__title" style={{ maxWidth: '100%', textAlign: 'center' }}>
              Send your workflow and get setup guidance
            </h2>
            <p className="lp__sub" style={{ maxWidth: '100%', textAlign: 'center', marginBottom: 0 }}>
              Use the form below to share your current workflow and receive async setup recommendations.
            </p>

            <div className="lp__contact-actions">
              <button className="lp__btn lp__btn--primary" onClick={() => openPilotEmail('contact_email')}>
                <FiMail size={16} />
                Request Setup by Email
              </button>
              <button className="lp__btn lp__btn--outline" onClick={() => scrollToSection('screenshots')}>
                <FiCamera size={16} />
                Review product screenshots
              </button>
            </div>

            <div className="lp__compliance-card">
              <h3>Business Profile and Refund Policy</h3>
              <p className="lp__compliance-preview">
                View account purpose, business description, support contact, refund terms, and social/business
                links on the dedicated policy page.
              </p>
              <div className="lp__policy-actions">
                <button className="lp__btn lp__btn--outline" onClick={openPolicyPage}>
                  Open Policy Page
                </button>
                <a href={`mailto:${CONTACT_EMAIL}`}>Support: {CONTACT_EMAIL}</a>
              </div>
            </div>

            <div className="lp__tally">
              {TALLY_FORM_ID ? (
                <iframe
                  src={`https://tally.so/embed/${TALLY_FORM_ID}?hideTitle=1&transparentBackground=1`}
                  loading="lazy"
                  width="100%"
                  height="680"
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
        <div className="lp__footer-copy">
          <p>(c) {currentYear} MedViz. Private 3D case review pilots for clinical teams.</p>
          <p className="lp__powered-by">Powered by PMC Projects Mastery Connect.</p>
        </div>
        <ul className="lp__footer-links">
          <li>
            <button onClick={() => openFreeDemo('footer_demo')}>Free Demo</button>
          </li>
          <li>
            <button onClick={() => (window.location.href = appendSource('/blog', 'landing_footer_blog'))}>Blog</button>
          </li>
          <li>
            <button onClick={() => scrollToSection('offer')}>Offer</button>
          </li>
          <li>
            <button onClick={() => scrollToSection('pricing')}>Pricing</button>
          </li>
          <li>
            <button onClick={() => openPilotEmail('footer_email')}>Contact</button>
          </li>
          <li>
            <button onClick={openPolicyPage}>Policy</button>
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
          <img src={lightboxSrc} alt="Screenshot preview" decoding="async" fetchPriority="high" />
        </div>
      )}

      {heroPromptVisible ? (
        <div
          style={{
            position: 'fixed',
            inset: '0',
            zIndex: 150,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div
            style={{
              position: 'fixed',
              right: '24px',
              bottom: '24px',
              width: 'min(420px, calc(100vw - 32px))',
              padding: '18px',
              borderRadius: '24px',
              border: '1px solid rgba(126, 240, 188, 0.16)',
              background: 'linear-gradient(160deg, rgba(9,22,39,0.96), rgba(15,39,69,0.94))',
              boxShadow: '0 24px 70px rgba(3,10,18,0.42)',
              backdropFilter: 'blur(14px)',
              zIndex: 151,
              color: '#f5fbff',
            }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.26em', textTransform: 'uppercase', color: '#7ef0bc' }}>
                Fast Check
              </div>
              <div style={{ marginTop: '8px', fontSize: '28px', fontWeight: 800, lineHeight: 1.1 }}>
                Want to test the live case or tell us what feels missing?
              </div>
            </div>
            <button
              type="button"
              onClick={() => setHeroPromptVisible(false)}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'rgba(255,255,255,0.66)',
                fontSize: '22px',
                lineHeight: 1,
                cursor: 'pointer',
                padding: 0,
              }}
              aria-label="Close prompt"
            >
              ×
            </button>
          </div>

          <p style={{ marginTop: '12px', fontSize: '14px', lineHeight: 1.6, color: 'rgba(255,255,255,0.72)' }}>
            Open the demo case now, or send quick feedback on what you expected to see, what feels valuable, or what still looks wrong.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '16px' }}>
            <button
              className="lp__btn lp__btn--free"
              onClick={() => {
                setHeroPromptVisible(false);
                openFreeDemo('landing_prompt_demo');
              }}
            >
              Open Demo Case
              <FiArrowRight size={16} />
            </button>
            <button
              className="lp__btn lp__btn--outline"
              onClick={() => {
                setHeroPromptVisible(false);
                trackEvent('cta_click', { target: 'feedback', source: 'landing_prompt' });
                scrollToSection('feedback');
              }}
            >
              Share Quick Feedback
            </button>
          </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
