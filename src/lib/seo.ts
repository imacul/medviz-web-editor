import { useEffect } from 'react';

export const SITE_URL = 'https://www.medviz3d.com';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/medviz-social-share.png`;
const JSON_LD_SCRIPT_ID = 'medviz-jsonld';

type MetaAttribute = 'name' | 'property';

export interface SeoConfig {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: 'website' | 'article';
  robots?: string;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

function upsertMeta(attribute: MetaAttribute, value: string, content: string) {
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

function upsertJsonLd(jsonLd?: SeoConfig['jsonLd']) {
  const existing = document.getElementById(JSON_LD_SCRIPT_ID);
  if (!jsonLd) {
    existing?.remove();
    return;
  }

  const script = existing ?? document.createElement('script');
  script.id = JSON_LD_SCRIPT_ID;
  script.setAttribute('type', 'application/ld+json');
  script.textContent = JSON.stringify(jsonLd);

  if (!existing) {
    document.head.appendChild(script);
  }
}

export function usePageSeo({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  type = 'website',
  robots = 'index, follow, max-image-preview:large',
  jsonLd,
}: SeoConfig) {
  useEffect(() => {
    const canonicalUrl = new URL(path, SITE_URL).toString();

    document.body.classList.remove('editor-mode');
    document.title = title;

    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', robots);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:site_name', 'MedViz 3D');
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:image:secure_url', image);
    upsertMeta('property', 'og:image:width', '1200');
    upsertMeta('property', 'og:image:height', '630');
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', image);
    upsertCanonical(canonicalUrl);
    upsertJsonLd(jsonLd);
  }, [description, image, jsonLd, path, robots, title, type]);
}
