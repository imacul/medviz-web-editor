import { useEffect } from 'react';
import { FiCheckCircle, FiMail } from 'react-icons/fi';

import SiteHeader from '../components/SiteHeader';
import './BusinessPolicyPage.css';

const CONTACT_EMAIL = 'hello@medviz3d.com';
const WEBSITE_URL = 'https://www.medviz3d.com';
const FOUNDER_SOCIAL_URL = 'https://x.com/ImmaculRichie';
const PMC_SOCIAL_URL = 'https://x.com/ProjMastery';

const PAGE_TITLE = 'MedViz Business Profile and Refund Policy';
const PAGE_DESCRIPTION =
  'Business profile, support contacts, and refund policy for MedViz by PMC Projects Mastery Connect.';
const PAGE_URL = 'https://www.medviz3d.com/business-profile-refund-policy';

function upsertMeta(attribute: 'name' | 'property', value: string, content: string) {
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

export default function BusinessPolicyPage() {
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    document.body.classList.remove('editor-mode');
    document.title = PAGE_TITLE;
    upsertMeta('name', 'description', PAGE_DESCRIPTION);
    upsertMeta('property', 'og:title', PAGE_TITLE);
    upsertMeta('property', 'og:description', PAGE_DESCRIPTION);
    upsertMeta('property', 'og:url', PAGE_URL);
    upsertMeta('name', 'twitter:title', PAGE_TITLE);
    upsertMeta('name', 'twitter:description', PAGE_DESCRIPTION);
    upsertCanonical(PAGE_URL);
  }, []);

  return (
    <div className="policy-page">
      <div className="policy-page__bg" />
      <SiteHeader
        items={[
          { label: 'Home', to: '/' },
          { label: 'Contact', to: '/#feedback' },
        ]}
        actions={[
          { label: 'Email Support', href: `mailto:${CONTACT_EMAIL}`, variant: 'primary' },
        ]}
      />

      <main className="policy-page__main">
        <section className="policy-page__card">
          <p className="policy-page__eyebrow">Compliance</p>
          <h1>Business Profile and Refund Policy</h1>
          <p className="policy-page__sub">
            This page provides official business information and customer support details for payment
            verification and account review.
          </p>

          <div className="policy-page__grid">
            <article>
              <h2>Business Profile</h2>
              <ul>
                <li>
                  <strong>Account purpose:</strong> Receive payments for MedViz pilot sprints and software
                  services delivered under PMC Projects Mastery Connect (PMC).
                </li>
                <li>
                  <strong>Business description:</strong> MedViz is a browser-based 3D review platform for oral
                  and maxillofacial workflows.
                </li>
              </ul>
            </article>

            <article>
              <h2>Support Contacts</h2>
              <ul>
                <li>
                  <FiMail size={16} />
                  <span>
                    <strong>Support email:</strong>{' '}
                    <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
                  </span>
                </li>
                <li>
                  <FiCheckCircle size={16} />
                  <span>
                    <strong>Website:</strong>{' '}
                    <a href={WEBSITE_URL} target="_blank" rel="noreferrer">
                      medviz3d.com
                    </a>
                  </span>
                </li>
              </ul>
            </article>
          </div>

          <article className="policy-page__refund">
            <h2>Refund Policy</h2>
            <p>
              Pilot fees are refundable before onboarding starts. After onboarding begins, completed work is
              billed based on delivered milestones.
            </p>
            <p>
              Monthly plans can be canceled before the next billing cycle. Refund requests can be sent to{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
          </article>

          <article className="policy-page__social">
            <h2>Business and Social Links</h2>
            <div className="policy-page__links">
              <a href={WEBSITE_URL} target="_blank" rel="noreferrer">
                Website: medviz3d.com
              </a>
              <a href={FOUNDER_SOCIAL_URL} target="_blank" rel="noreferrer">
                Founder: x.com/ImmaculRichie
              </a>
              <a href={PMC_SOCIAL_URL} target="_blank" rel="noreferrer">
                PMC: x.com/ProjMastery
              </a>
            </div>
          </article>
        </section>
      </main>

      <footer className="policy-page__footer">
        <p>(c) {currentYear} MedViz. Powered by PMC Projects Mastery Connect.</p>
      </footer>
    </div>
  );
}
