import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { blogPostsData } from '../src/content/blogPostsData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const distDir = path.join(repoRoot, 'dist');

const SITE_URL = 'https://www.medviz3d.com';
const SITE_NAME = 'MedViz 3D';
const DEFAULT_OG_IMAGE = `${SITE_URL}/medviz-social-share.png`;
const BLOG_TITLE = 'MedViz Blog | Faster 3D Case Review for Oral Surgery and Implant Teams';
const BLOG_DESCRIPTION =
  'Buyer-focused articles on browser-based 3D case review, implant planning workflow, and faster collaboration for oral surgery teams.';
const DEFAULT_IMAGE_ALT = 'MedViz 3D case review software for oral surgery and implant teams';

const STATIC_SITEMAP_ENTRIES = [
  { loc: `${SITE_URL}/`, lastmod: '2026-03-26', changefreq: 'daily', priority: '1.0' },
  { loc: `${SITE_URL}/demo`, lastmod: '2026-03-26', changefreq: 'daily', priority: '0.95' },
  { loc: `${SITE_URL}/business-profile-refund-policy`, lastmod: '2026-03-26', changefreq: 'weekly', priority: '0.6' },
];

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeJsonForHtml(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}

function formatDisplayDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function getArticleUrl(slug) {
  return `${SITE_URL}/blog/${slug}`;
}

function getAbsoluteUrl(pathname) {
  return new URL(pathname, SITE_URL).toString();
}

async function readAppShellAssets() {
  const appShell = await fs.readFile(path.join(distDir, 'index.html'), 'utf8');

  const iconTag = appShell.match(/<link rel="icon"[^>]+>/i)?.[0] ?? '';
  const stylesheetTags = [...appShell.matchAll(/<link rel="stylesheet"[^>]*>/gi)].map((match) => match[0]).join('\n    ');
  const scriptTags = [...appShell.matchAll(/<script type="module"[^>]*><\/script>/gi)].map((match) => match[0]).join('\n    ');

  if (!stylesheetTags || !scriptTags) {
    throw new Error('Could not locate built asset tags in dist/index.html.');
  }

  return { iconTag, stylesheetTags, scriptTags };
}

function buildMetaTags({
  title,
  description,
  canonicalUrl,
  type,
  image = DEFAULT_OG_IMAGE,
  imageAlt = DEFAULT_IMAGE_ALT,
  keywords = [],
  publishedAt,
  updatedAt,
}) {
  const lines = [
    `<meta name="description" content="${escapeHtml(description)}" />`,
    '<meta name="robots" content="index, follow, max-image-preview:large" />',
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
    `<meta property="og:type" content="${escapeHtml(type)}" />`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    `<meta property="og:image:secure_url" content="${escapeHtml(image)}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
  ];

  if (keywords.length > 0) {
    lines.push(`<meta name="keywords" content="${escapeHtml(keywords.join(', '))}" />`);
  }

  if (publishedAt) {
    lines.push(`<meta property="article:published_time" content="${escapeHtml(publishedAt)}" />`);
  }

  if (updatedAt) {
    lines.push(`<meta property="article:modified_time" content="${escapeHtml(updatedAt)}" />`);
  }

  return lines.join('\n    ');
}

function buildDocument({ title, description, pathname, type, jsonLd, bodyMarkup, keywords, publishedAt, updatedAt }, assets) {
  const canonicalUrl = getAbsoluteUrl(pathname);
  const metaTags = buildMetaTags({ title, description, canonicalUrl, type, keywords, publishedAt, updatedAt });
  const jsonLdScript = `<script type="application/ld+json">${escapeJsonForHtml(jsonLd)}</script>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    ${metaTags}
    ${assets.iconTag}
    ${jsonLdScript}
    <style>
      :root {
        color-scheme: light;
        --mv-bg: #f4f8fd;
        --mv-surface: rgba(255, 255, 255, 0.94);
        --mv-ink: #10233d;
        --mv-muted: #56718e;
        --mv-line: rgba(16, 35, 61, 0.12);
        --mv-accent: #0f6fcf;
        --mv-accent-strong: #0a4f96;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        min-height: 100%;
        background:
          radial-gradient(circle at top, rgba(92, 166, 255, 0.18), transparent 38%),
          linear-gradient(180deg, #f8fbff 0%, #eef5fb 52%, #e8f0f7 100%);
        color: var(--mv-ink);
        font-family: "Segoe UI", Arial, sans-serif;
      }

      a {
        color: var(--mv-accent-strong);
      }

      .seo-shell {
        width: min(1120px, calc(100% - 32px));
        margin: 0 auto;
        padding: 32px 0 56px;
      }

      .seo-header,
      .seo-card {
        background: var(--mv-surface);
        border: 1px solid var(--mv-line);
        border-radius: 24px;
        box-shadow: 0 24px 70px rgba(13, 31, 54, 0.08);
        backdrop-filter: blur(18px);
      }

      .seo-header {
        padding: 28px;
        margin-bottom: 24px;
      }

      .seo-brand {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 14px;
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--mv-muted);
      }

      .seo-brand strong {
        color: var(--mv-ink);
      }

      .seo-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.7fr) minmax(260px, 0.95fr);
        gap: 24px;
      }

      .seo-card {
        padding: 28px;
      }

      .seo-eyebrow {
        margin: 0 0 12px;
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--mv-accent);
      }

      .seo-card h1,
      .seo-card h2,
      .seo-card h3 {
        margin-top: 0;
        line-height: 1.15;
      }

      .seo-card h1 {
        margin-bottom: 16px;
        font-size: clamp(2rem, 3.2vw, 3.4rem);
      }

      .seo-card h2 {
        margin-bottom: 12px;
        font-size: clamp(1.45rem, 2.1vw, 2rem);
      }

      .seo-card h3 {
        margin-bottom: 10px;
        font-size: 1.1rem;
      }

      .seo-card p,
      .seo-card li {
        font-size: 1rem;
        line-height: 1.7;
        color: var(--mv-ink);
      }

      .seo-card p:last-child {
        margin-bottom: 0;
      }

      .seo-muted {
        color: var(--mv-muted);
      }

      .seo-meta,
      .seo-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        padding: 0;
        margin: 18px 0 0;
        list-style: none;
      }

      .seo-chip {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        border: 1px solid rgba(15, 111, 207, 0.18);
        background: rgba(15, 111, 207, 0.08);
        padding: 8px 12px;
        font-size: 0.92rem;
        color: var(--mv-accent-strong);
      }

      .seo-list {
        display: grid;
        gap: 18px;
      }

      .seo-post-card {
        display: block;
        padding: 20px;
        border-radius: 18px;
        border: 1px solid var(--mv-line);
        text-decoration: none;
        color: inherit;
        background: rgba(255, 255, 255, 0.88);
      }

      .seo-post-card h2 {
        margin: 10px 0 10px;
        font-size: 1.35rem;
      }

      .seo-post-card p {
        margin: 0;
        color: var(--mv-muted);
      }

      .seo-body {
        display: grid;
        gap: 18px;
      }

      .seo-body section + section {
        margin-top: 24px;
      }

      .seo-body ul {
        padding-left: 1.2rem;
      }

      .seo-aside {
        display: grid;
        gap: 18px;
        align-content: start;
      }

      .seo-cta {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 0 16px;
        border-radius: 999px;
        background: linear-gradient(135deg, #0f6fcf 0%, #1a8af0 100%);
        color: #fff;
        font-weight: 700;
        text-decoration: none;
      }

      .seo-secondary-link {
        font-weight: 600;
        text-decoration: none;
      }

      @media (max-width: 860px) {
        .seo-grid {
          grid-template-columns: 1fr;
        }

        .seo-shell {
          width: min(100% - 20px, 1120px);
          padding-top: 20px;
        }

        .seo-header,
        .seo-card {
          border-radius: 18px;
          padding: 22px;
        }
      }
    </style>
    ${assets.stylesheetTags}
    ${assets.scriptTags}
  </head>
  <body>
    <div id="root">${bodyMarkup}</div>
  </body>
</html>`;
}

function renderBlogIndexBody(posts) {
  return {
    pathname: '/blog',
    title: BLOG_TITLE,
    description: BLOG_DESCRIPTION,
    type: 'website',
    keywords: posts.flatMap((post) => post.keywords),
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'MedViz Blog',
      url: `${SITE_URL}/blog`,
      description: BLOG_DESCRIPTION,
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        url: SITE_URL,
      },
      blogPost: posts.map((post) => ({
        '@type': 'BlogPosting',
        headline: post.title,
        url: getArticleUrl(post.slug),
        datePublished: post.publishedAt,
        dateModified: post.updatedAt,
        description: post.description,
      })),
    },
    bodyMarkup: `
      <main class="seo-shell">
        <header class="seo-header">
          <div class="seo-brand"><strong>MedViz 3D</strong><span>Blog</span></div>
          <p class="seo-eyebrow">Insights for faster case review</p>
          <h1>Practical guides for teams that want faster 3D case review and clearer next steps.</h1>
          <p class="seo-muted">
            Explore articles on browser-based review, implant workflow, and low-friction evaluation for clinics that
            want less back-and-forth, better collaboration, and more confident treatment decisions.
          </p>
        </header>
        <section class="seo-card seo-list">
          ${posts
            .map(
              (post) => `
                <a class="seo-post-card" href="/blog/${escapeHtml(post.slug)}">
                  <div class="seo-meta">
                    <span class="seo-chip">${escapeHtml(post.category)}</span>
                    <span class="seo-chip">${escapeHtml(post.readTime)}</span>
                    <span class="seo-chip">${escapeHtml(formatDisplayDate(post.publishedAt))}</span>
                  </div>
                  <h2>${escapeHtml(post.title)}</h2>
                  <p>${escapeHtml(post.description)}</p>
                  <div class="seo-tags">
                    ${post.keywords.map((keyword) => `<span class="seo-chip">${escapeHtml(keyword)}</span>`).join('')}
                  </div>
                </a>
              `
            )
            .join('')}
        </section>
      </main>
    `,
  };
}

function renderArticleBody(post, relatedPosts) {
  const articleUrl = getArticleUrl(post.slug);

  return {
    pathname: `/blog/${post.slug}`,
    title: `${post.title} | MedViz Blog`,
    description: post.description,
    type: 'article',
    keywords: post.keywords,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.description,
        image: `${SITE_URL}${post.heroImagePath}`,
        author: {
          '@type': 'Organization',
          name: SITE_NAME,
        },
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
          url: SITE_URL,
        },
        datePublished: post.publishedAt,
        dateModified: post.updatedAt,
        mainEntityOfPage: articleUrl,
        keywords: post.keywords.join(', '),
        articleSection: post.category,
        about: post.keywords.map((keyword) => ({
          '@type': 'Thing',
          name: keyword,
        })),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
          { '@type': 'ListItem', position: 3, name: post.title, item: articleUrl },
        ],
      },
    ],
    bodyMarkup: `
      <main class="seo-shell">
        <header class="seo-header">
          <div class="seo-brand"><strong>MedViz 3D</strong><span>Article</span></div>
          <p class="seo-eyebrow">${escapeHtml(post.kicker)}</p>
          <h1>${escapeHtml(post.title)}</h1>
          <p class="seo-muted">${escapeHtml(post.description)}</p>
          <div class="seo-meta">
            <span class="seo-chip">${escapeHtml(post.category)}</span>
            <span class="seo-chip">${escapeHtml(post.audience)}</span>
            <span class="seo-chip">${escapeHtml(post.readTime)}</span>
            <span class="seo-chip">${escapeHtml(formatDisplayDate(post.publishedAt))}</span>
          </div>
        </header>
        <div class="seo-grid">
          <article class="seo-card seo-body">
            ${post.sections
              .map(
                (section) => `
                  <section>
                    <h2>${escapeHtml(section.heading)}</h2>
                    ${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
                    ${
                      section.bullets?.length
                        ? `<ul>${section.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul>`
                        : ''
                    }
                  </section>
                `
              )
              .join('')}
          </article>
          <aside class="seo-aside">
            <section class="seo-card">
              <h3>See the workflow in action</h3>
              <p class="seo-muted">
                If this matches the bottleneck your team is trying to solve, open the MedViz demo and review a case in
                the browser.
              </p>
              <p><a class="seo-cta" href="${escapeHtml(post.ctaHref)}">${escapeHtml(post.ctaLabel)}</a></p>
            </section>
            <section class="seo-card">
              <h3>Topics covered</h3>
              <div class="seo-tags">
                ${post.keywords.map((keyword) => `<span class="seo-chip">${escapeHtml(keyword)}</span>`).join('')}
              </div>
            </section>
            <section class="seo-card">
              <h3>Read next</h3>
              <div class="seo-list">
                ${relatedPosts
                  .map(
                    (relatedPost) => `
                      <a class="seo-secondary-link" href="/blog/${escapeHtml(relatedPost.slug)}">
                        ${escapeHtml(relatedPost.title)}
                      </a>
                    `
                  )
                  .join('')}
              </div>
            </section>
          </aside>
        </div>
      </main>
    `,
  };
}

async function writeHtmlFile(targetPath, html) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, html, 'utf8');
}

async function writeStaticBlogPages(assets) {
  const blogIndexPage = renderBlogIndexBody(blogPostsData);
  await writeHtmlFile(path.join(distDir, 'blog', 'index.html'), buildDocument(blogIndexPage, assets));

  for (const post of blogPostsData) {
    const relatedPosts = blogPostsData.filter((candidate) => candidate.slug !== post.slug).slice(0, 2);
    const articlePage = renderArticleBody(post, relatedPosts);
    await writeHtmlFile(path.join(distDir, 'blog', post.slug, 'index.html'), buildDocument(articlePage, assets));
  }
}

async function writeSitemap() {
  const blogIndexLastmod = blogPostsData.reduce(
    (latest, post) => (post.updatedAt > latest ? post.updatedAt : latest),
    blogPostsData[0]?.updatedAt ?? '2026-04-01'
  );

  const blogEntries = [
    { loc: `${SITE_URL}/blog`, lastmod: blogIndexLastmod, changefreq: 'weekly', priority: '0.9' },
    ...blogPostsData.map((post) => ({
      loc: getArticleUrl(post.slug),
      lastmod: post.updatedAt,
      changefreq: 'monthly',
      priority: '0.8',
    })),
  ];

  const sitemapEntries = [...STATIC_SITEMAP_ENTRIES, ...blogEntries];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries
  .map(
    (entry) => `  <url>
    <loc>${escapeHtml(entry.loc)}</loc>
    <lastmod>${escapeHtml(entry.lastmod)}</lastmod>
    <changefreq>${escapeHtml(entry.changefreq)}</changefreq>
    <priority>${escapeHtml(entry.priority)}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

  await fs.writeFile(path.join(distDir, 'sitemap.xml'), xml, 'utf8');
}

async function main() {
  const assets = await readAppShellAssets();
  await writeStaticBlogPages(assets);
  await writeSitemap();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
