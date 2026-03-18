import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';

import LandingPage from '../LandingPage.jsx';
import { useAuth } from '../features/auth/AuthProvider';

export default function LandingPageRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    document.body.classList.remove('editor-mode');
    document.title = 'MedViz - Clinical 3D Review';
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
