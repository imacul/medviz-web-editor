import { Link, Navigate, useParams } from 'react-router';

import SiteHeader from '../components/SiteHeader';
import { blogPostBySlug, blogPosts, getBlogPostUrl } from '../content/blogPosts';
import { appendSource, trackEvent } from '../lib/analytics';
import { SITE_URL, usePageSeo } from '../lib/seo';
import './BlogPage.css';

export default function BlogArticlePage() {
  const { slug } = useParams();
  const post = slug ? blogPostBySlug.get(slug) : undefined;

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  return <BlogArticlePageView slug={post.slug} />;
}

function BlogArticlePageView({ slug }: { slug: string }) {
  const post = blogPostBySlug.get(slug);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const relatedPosts = blogPosts.filter((item) => item.slug !== post.slug).slice(0, 2);
  const articleUrl = getBlogPostUrl(post.slug);

  usePageSeo({
    title: `${post.title} | MedViz Blog`,
    description: post.description,
    path: `/blog/${post.slug}`,
    type: 'article',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: post.description,
        image: post.heroImage,
        author: {
          '@type': 'Organization',
          name: 'MedViz 3D',
        },
        publisher: {
          '@type': 'Organization',
          name: 'MedViz 3D',
          url: SITE_URL,
        },
        datePublished: post.publishedAt,
        dateModified: post.updatedAt,
        mainEntityOfPage: articleUrl,
        keywords: post.keywords.join(', '),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: SITE_URL,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Blog',
            item: `${SITE_URL}/blog`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: post.title,
            item: articleUrl,
          },
        ],
      },
    ],
  });

  return (
    <div className="blog-page">
      <SiteHeader
        items={[
          { label: 'Landing Page', to: '/' },
          { label: 'Blog', to: '/blog' },
          { label: 'Free Demo', href: appendSource('/demo', `blog_article_${post.slug}`) },
          { label: 'Contact', to: '/#feedback' },
        ]}
        actions={[
          { label: 'Try Free Demo', href: appendSource('/demo', `blog_article_header_${post.slug}`), variant: 'primary' },
        ]}
      />

      <main className="blog-page__shell">
        <Link className="blog-page__backlink" to="/blog">
          Back to blog
        </Link>

        <section className="blog-page__hero">
          <div className="blog-page__breadcrumbs">
            <Link to="/">Home</Link>
            <span>/</span>
            <Link to="/blog">Blog</Link>
            <span>/</span>
            <span>{post.kicker}</span>
          </div>
          <p className="blog-page__eyebrow">{post.kicker}</p>
          <h1>{post.title}</h1>
          <p>{post.description}</p>
          <div className="blog-page__meta">
            <span className="blog-page__chip">{post.category}</span>
            <span>{post.audience}</span>
            <span>{post.readTime}</span>
            <span>
              {new Date(post.publishedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        </section>

        <div className="blog-page__article-layout">
          <article className="blog-page__article">
            {post.sections.map((section) => (
              <section key={section.heading}>
                <h2>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.bullets ? (
                  <ul>
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </article>

          <aside className="blog-page__sidebar">
            <div className="blog-page__sidebar-card">
              <h3>See the workflow in action</h3>
              <p>
                If this article matches the bottleneck your team is trying to solve, open the demo and explore the
                review flow while the use case is still fresh.
              </p>
              <div className="blog-page__cta-actions">
                <a
                  className="blog-page__button blog-page__button--primary"
                  href={post.ctaHref}
                  onClick={() => trackEvent('cta_click', { target: 'demo', source: `blog_article_sidebar_${post.slug}` })}
                >
                  {post.ctaLabel}
                </a>
              </div>
            </div>

            <div className="blog-page__sidebar-card">
              <h3>Topics covered</h3>
              <ul>
                {post.keywords.map((keyword) => (
                  <li key={keyword}>{keyword}</li>
                ))}
              </ul>
            </div>

            <div className="blog-page__sidebar-card">
              <h3>Read next</h3>
              <ul>
                {relatedPosts.map((relatedPost) => (
                  <li key={relatedPost.slug}>
                    <Link to={`/blog/${relatedPost.slug}`}>{relatedPost.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        <section className="blog-page__cta-band">
          <p className="blog-page__eyebrow">Next Step</p>
          <h2>See whether this review workflow feels faster on a real case.</h2>
          <p>
            Open the demo to explore browser-based review, measurement, annotation, and shared context without adding
            more friction to your current evaluation process.
          </p>
          <div className="blog-page__cta-actions">
            <a
              className="blog-page__button blog-page__button--primary"
              href={post.ctaHref}
              onClick={() => trackEvent('cta_click', { target: 'demo', source: `blog_article_bottom_${post.slug}` })}
            >
              {post.ctaLabel}
            </a>
            <Link className="blog-page__button blog-page__button--ghost" to={appendSource('/#feedback', `blog_article_contact_${post.slug}`)}>
              Request a clinic walkthrough
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
