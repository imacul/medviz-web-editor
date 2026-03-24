import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';

import LandingPage from '../LandingPage.jsx';
import { useAuth } from '../features/auth/AuthProvider';

const LANDING_TITLE = 'MedViz 3D Case Review Software for Oral Surgery and Implant Teams';
const LANDING_DESCRIPTION =
  'MedViz is browser-based 3D case review software for oral and maxillofacial teams to review, measure, annotate, and share cases.';
const LANDING_URL = 'https://www.medviz3d.com/';
const LANDING_IMAGE = 'https://www.medviz3d.com/medviz-social-share.png';

function upsertMeta(attribute: 'name' | 'property', value: string, content: string) {
  let meta = document.querySelector(`meta[${attribute}="${value}"]`) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attribute, value);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

export default function LandingPageRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    document.body.classList.remove('editor-mode');
    document.title = LANDING_TITLE;
    upsertMeta('name', 'description', LANDING_DESCRIPTION);
    upsertMeta('property', 'og:title', LANDING_TITLE);
    upsertMeta('property', 'og:description', LANDING_DESCRIPTION);
    upsertMeta('property', 'og:url', LANDING_URL);
    upsertMeta('property', 'og:image', LANDING_IMAGE);
    upsertMeta('property', 'og:image:secure_url', LANDING_IMAGE);
    upsertMeta('property', 'og:image:width', '1200');
    upsertMeta('property', 'og:image:height', '630');
    upsertMeta('property', 'og:image:alt', 'MedViz 3D case review software for oral surgery and implant teams');
    upsertMeta('name', 'twitter:title', LANDING_TITLE);
    upsertMeta('name', 'twitter:description', LANDING_DESCRIPTION);
    upsertMeta('name', 'twitter:image', LANDING_IMAGE);
    upsertCanonical(LANDING_URL);
  }, []);

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    const sectionId = location.hash.slice(1);
    let timeoutId = 0;
    const scrollToSection = () => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const animationFrame = window.requestAnimationFrame(() => {
      timeoutId = window.setTimeout(scrollToSection, 0);
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(timeoutId);
    };
  }, [location.hash, location.pathname]);

  return (
    <LandingPage
      onEnterEditor={() => navigate(user ? '/cases/new' : '/login?redirectTo=%2Fcases%2Fnew')}
      onOpenDashboard={() => navigate(user ? '/dashboard' : '/login?redirectTo=%2Fdashboard')}
      onLogin={() => navigate('/login')}
      onSignup={() => navigate('/signup')}
      isAuthenticated={Boolean(user)}
    />
  );
}
