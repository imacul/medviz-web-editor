import { useEffect, useState } from 'react';
import { FiMenu, FiX } from 'react-icons/fi';
import { Link, useLocation } from 'react-router';

import logoSvg from '../../assets/medviz-logo.svg';
import './SiteHeader.css';

type HeaderItem = {
  label: string;
  to?: string;
  href?: string;
  onClick?: () => void;
  variant?: 'link' | 'outline' | 'primary';
};

interface SiteHeaderProps {
  items?: HeaderItem[];
  actions?: HeaderItem[];
  onBrandClick?: () => void;
}

export default function SiteHeader({ items = [], actions = [], onBrandClick }: SiteHeaderProps) {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isLandingPage = location.pathname === '/';
  const defaultItems: HeaderItem[] = isLandingPage
    ? [
        { label: 'Review Tools', href: '#features' },
        { label: 'Case Flow', href: '#workflow' },
        { label: 'In Use', href: '#screenshots' },
        { label: 'Specialties', href: '#usecases' },
        { label: 'Feedback', href: '#feedback' },
      ]
    : [
        { label: 'Review Tools', to: '/#features' },
        { label: 'Case Flow', to: '/#workflow' },
        { label: 'In Use', to: '/#screenshots' },
        { label: 'Specialties', to: '/#usecases' },
        { label: 'Feedback', to: '/#feedback' },
      ];
  const navigationItems = items.length > 0 ? items : defaultItems;

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname, location.search, location.hash]);

  const renderItem = (item: HeaderItem, mobile = false) => {
    const classes =
      item.variant === 'primary'
        ? 'site-header__button site-header__button--primary'
        : item.variant === 'outline'
          ? 'site-header__button site-header__button--outline'
          : mobile
            ? 'site-header__mobile-link'
            : 'site-header__link';

    if (item.to) {
      return (
        <Link key={item.label} to={item.to} className={classes}>
          {item.label}
        </Link>
      );
    }

    if (item.href) {
      return (
        <a key={item.label} href={item.href} className={classes}>
          {item.label}
        </a>
      );
    }

    return (
      <button
        key={item.label}
        type="button"
        onClick={item.onClick}
        className={classes}
      >
        {item.label}
      </button>
    );
  };

  return (
    <>
      <header className="site-header">
        <div className="site-header__inner">
          {onBrandClick ? (
            <button type="button" onClick={onBrandClick} className="site-header__brand">
              <img src={logoSvg} alt="MedViz logo" />
              <span className="site-header__brand-text">
                Med<em>Viz</em>
              </span>
            </button>
          ) : (
            <Link to="/" className="site-header__brand">
              <img src={logoSvg} alt="MedViz logo" />
              <span className="site-header__brand-text">
                Med<em>Viz</em>
              </span>
            </Link>
          )}

          <nav className="site-header__nav">
            {navigationItems.map((item) => renderItem(item))}
          </nav>

          <div className="site-header__actions">
            {actions.map((item) => renderItem(item))}
          </div>

          <button
            type="button"
            onClick={() => setIsMenuOpen((value) => !value)}
            className="site-header__toggle"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      <div className={`site-header__mobile ${isMenuOpen ? 'site-header__mobile--open' : ''}`}>
        {navigationItems.map((item) => renderItem(item, true))}
        {actions.length > 0 ? <div className="site-header__divider" /> : null}
        {actions.map((item) => renderItem(item, true))}
      </div>
    </>
  );
}
