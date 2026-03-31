import { track } from '@vercel/analytics';

type AnalyticsValue = string | number | boolean;

export function trackEvent(name: string, properties?: Record<string, AnalyticsValue>) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    track(name, properties);
  } catch {
    // Analytics must never block the primary user flow.
  }
}

export function appendSource(path: string, source: string) {
  const url = new URL(path, window.location.origin);
  url.searchParams.set('src', source);
  return `${url.pathname}${url.search}${url.hash}`;
}
