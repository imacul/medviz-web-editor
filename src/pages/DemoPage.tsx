import { useEffect, useMemo } from 'react';
import { Navigate, useSearchParams } from 'react-router';

import { trackEvent } from '../lib/analytics';

const DEMO_SHARE_TOKEN = '5588eaee-6e5e-49ce-9c29-953b43883d32';

export default function DemoPage() {
  const [searchParams] = useSearchParams();
  const source = searchParams.get('src') || 'direct';

  useEffect(() => {
    document.body.classList.add('editor-mode');
    document.title = 'MedViz Free Demo';
    trackEvent('demo_view', { source, mode: 'shared_case_redirect' });

    return () => {
      document.body.classList.remove('editor-mode');
    };
  }, [source]);

  const redirectTo = useMemo(() => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('shareToken', DEMO_SHARE_TOKEN);
    return `/editor?${nextParams.toString()}`;
  }, [searchParams]);

  return <Navigate to={redirectTo} replace />;
}
