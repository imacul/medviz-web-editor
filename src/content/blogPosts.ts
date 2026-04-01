import { SITE_URL } from '../lib/seo';
import { blogPostsData } from './blogPostsData';

export interface BlogSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  kicker: string;
  category: string;
  audience: string;
  publishedAt: string;
  updatedAt: string;
  readTime: string;
  keywords: string[];
  ctaLabel: string;
  ctaHref: string;
  heroImage: string;
  sections: BlogSection[];
}

type RawBlogPost = Omit<BlogPost, 'heroImage'> & {
  heroImagePath: string;
};

export const blogPosts: BlogPost[] = (blogPostsData as RawBlogPost[]).map((post) => ({
  ...post,
  heroImage: new URL(post.heroImagePath, SITE_URL).toString(),
}));

export const blogPostBySlug = new Map(blogPosts.map((post) => [post.slug, post]));

export function getBlogPostUrl(slug: string) {
  return `${SITE_URL}/blog/${slug}`;
}
