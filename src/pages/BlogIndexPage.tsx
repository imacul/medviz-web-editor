import { Link } from 'react-router';

import SiteHeader from '../components/SiteHeader';
import { blogPosts } from '../content/blogPosts';
import { appendSource, trackEvent } from '../lib/analytics';
import { SITE_URL, usePageSeo } from '../lib/seo';
import './BlogPage.css';

const BLOG_TITLE = 'MedViz Blog | Faster 3D Case Review for Oral Surgery and Implant Teams';
const BLOG_DESCRIPTION =
  'Buyer-focused articles on browser-based 3D case review, implant planning workflow, and faster collaboration for oral surgery teams.';

export default function BlogIndexPage() {
  usePageSeo({
    title: BLOG_TITLE,
    description: BLOG_DESCRIPTION,
    path: '/blog',
    keywords: blogPosts.flatMap((post) => post.keywords),
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'MedViz Blog',
      url: `${SITE_URL}/blog`,
      description: BLOG_DESCRIPTION,
      publisher: {
        '@type': 'Organization',
        name: 'MedViz 3D',
        url: SITE_URL,
      },
      blogPost: blogPosts.map((post) => ({
        '@type': 'BlogPosting',
        headline: post.title,
        url: `${SITE_URL}/blog/${post.slug}`,
        datePublished: post.publishedAt,
        dateModified: post.updatedAt,
        description: post.description,
      })),
    },
  });

  return (
    <div className="blog-page">
      <SiteHeader
        items={[
          { label: 'Free Demo', href: appendSource('/demo', 'blog_header_demo') },
          { label: 'Landing Page', to: '/' },
          { label: 'Blog', to: '/blog' },
          { label: 'Contact', to: '/#feedback' },
        ]}
        actions={[
          { label: 'Try Free Demo', href: appendSource('/demo', 'blog_header_cta'), variant: 'primary' },
        ]}
      />

      <main className="blog-page__shell">
        <section className="blog-page__hero">
          <p className="blog-page__eyebrow">Insights for faster case review</p>
          <h1>Practical guides for teams that want faster 3D case review and clearer next steps.</h1>
          <p>
            Explore articles on browser-based review, implant workflow, and low-friction evaluation for clinics that
            want less back-and-forth, better collaboration, and more confident treatment decisions.
          </p>
          <div className="blog-page__hero-actions">
            <a
              className="blog-page__button blog-page__button--primary"
              href={appendSource('/demo', 'blog_index_primary')}
              onClick={() => trackEvent('cta_click', { target: 'demo', source: 'blog_index_primary' })}
            >
              Review a case free
            </a>
            <Link className="blog-page__button blog-page__button--ghost" to={appendSource('/#feedback', 'blog_index_contact')}>
              Talk through your workflow
            </Link>
          </div>
        </section>

        <section className="blog-page__grid">
          <div className="blog-page__post-grid">
            {blogPosts.map((post) => (
              <Link
                key={post.slug}
                to={`/blog/${post.slug}`}
                className="blog-page__card blog-page__post-card"
                onClick={() => trackEvent('blog_post_open', { slug: post.slug, source: 'blog_index_card' })}
              >
                <div className="blog-page__meta">
                  <span className="blog-page__chip">{post.category}</span>
                  <span>{post.readTime}</span>
                  <span>{new Date(post.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}</span>
                </div>
                <h3>{post.title}</h3>
                <p>{post.description}</p>
                <div className="blog-page__tags">
                  {post.keywords.map((keyword) => (
                    <span key={keyword} className="blog-page__tag">
                      {keyword}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="blog-page__cta-band">
          <p className="blog-page__eyebrow">Ready to see the workflow</p>
          <h2>Move from research to a real case review in one step.</h2>
          <p>
            If one of these articles matches a problem your team is dealing with, open the demo and see how a
            browser-based review workflow feels before you change anything in your current process.
          </p>
          <div className="blog-page__cta-actions">
            <a className="blog-page__button blog-page__button--primary" href={appendSource('/demo', 'blog_index_bottom')}>
              Open the free demo
            </a>
            <Link className="blog-page__button blog-page__button--ghost" to={appendSource('/#feedback', 'blog_index_bottom_contact')}>
              Request a clinic walkthrough
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
