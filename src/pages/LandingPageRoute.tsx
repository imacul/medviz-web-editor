import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { useAuth } from '../features/auth/AuthProvider';
import { appendSource, trackEvent } from '../lib/analytics';
import { usePageSeo } from '../lib/seo';
import LandingPage from '../LandingPage.jsx';

const LANDING_TITLE = 'Free Browser-Based 3D Case Review for Oral Surgery and Implant Teams | MedViz';
const LANDING_DESCRIPTION =
  'Try MedViz free by importing your own de-identified model. Review, measure, annotate, share, and export reports in the browser. Optional guided pilots for custom setup.';
export default function LandingPageRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  usePageSeo({
    title: LANDING_TITLE,
    description: LANDING_DESCRIPTION,
    path: '/',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'MedViz 3D',
      url: 'https://www.medviz3d.com/',
      description:
        'Free browser-based 3D case review where teams can import de-identified models, measure, annotate, collaborate, and export reports.',
    },
  });

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
      onEnterEditor={(source: string = 'landing_workspace') => {
        trackEvent('cta_click', { target: 'workspace', source });
        navigate(
          user
            ? '/cases/new'
            : `${appendSource('/login?redirectTo=%2Fcases%2Fnew', source)}`
        );
      }}
      onOpenDashboard={(source: string = 'landing_dashboard') => {
        trackEvent('cta_click', { target: 'dashboard', source });
        navigate(
          user
            ? '/dashboard'
            : `${appendSource('/login?redirectTo=%2Fdashboard', source)}`
        );
      }}
      onLogin={(source: string = 'landing_login') => {
        trackEvent('cta_click', { target: 'login', source });
        navigate(appendSource('/login', source));
      }}
      onSignup={(source: string = 'landing_signup') => {
        trackEvent('cta_click', { target: 'signup', source });
        navigate(appendSource('/signup', source));
      }}
      isAuthenticated={Boolean(user)}
    />
  );
}
