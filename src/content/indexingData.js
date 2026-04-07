import { blogPostsData } from './blogPostsData.js';

export const staticIndexablePages = [
  {
    path: '/',
    lastmod: '2026-03-26',
    changefreq: 'daily',
    priority: '1.0',
  },
  {
    path: '/demo',
    lastmod: '2026-03-26',
    changefreq: 'daily',
    priority: '0.95',
  },
  {
    path: '/business-profile-refund-policy',
    lastmod: '2026-03-26',
    changefreq: 'weekly',
    priority: '0.6',
  },
];

export function getBlogIndexEntry() {
  const lastmod = blogPostsData.reduce(
    (latest, post) => (post.updatedAt > latest ? post.updatedAt : latest),
    blogPostsData[0]?.updatedAt ?? '2026-04-01'
  );

  return {
    path: '/blog',
    lastmod,
    changefreq: 'weekly',
    priority: '0.9',
  };
}

export function getBlogArticleEntries() {
  return blogPostsData.map((post) => ({
    path: `/blog/${post.slug}`,
    lastmod: post.updatedAt,
    changefreq: 'monthly',
    priority: '0.8',
  }));
}

export function getSitemapEntries() {
  return [...staticIndexablePages, getBlogIndexEntry(), ...getBlogArticleEntries()];
}

export function getIndexableUrlList(siteUrl) {
  return getSitemapEntries().map((entry) => new URL(entry.path, siteUrl).toString());
}
