import { useEffect, useRef, useState } from 'react';
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
  const [layoutMode, setLayoutMode] = useState<'desktop' | 'compact' | 'mobile'>('desktop');
  const innerRef = useRef<HTMLDivElement | null>(null);
  const brandRef = useRef<HTMLElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const actionsRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    const measureLayout = () => {
      const inner = innerRef.current;
      const brand = brandRef.current;
      const nav = navRef.current;
      const actionsEl = actionsRef.current;

      if (!inner || !brand || !nav) {
        return;
      }

      const availableWidth = inner.clientWidth;
      const brandWidth = brand.scrollWidth;
      const navWidth = nav.scrollWidth;
      const actionsWidth = actionsEl?.scrollWidth ?? 0;

      const desktopGapAllowance = actionsEl ? 72 : 40;
      const compactTopRowAllowance = actionsEl ? 24 : 0;

      const desktopFits =
        brandWidth + navWidth + actionsWidth + desktopGapAllowance <= availableWidth;
      const compactFits =
        brandWidth + actionsWidth + compactTopRowAllowance <= availableWidth &&
        navWidth <= availableWidth;

      const nextMode = desktopFits ? 'desktop' : compactFits ? 'compact' : 'mobile';
      setLayoutMode((current) => (current === nextMode ? current : nextMode));
    };

    measureLayout();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            measureLayout();
          })
        : null;

    if (resizeObserver) {
      if (innerRef.current) {
        resizeObserver.observe(innerRef.current);
      }
      if (brandRef.current) {
        resizeObserver.observe(brandRef.current);
      }
      if (navRef.current) {
        resizeObserver.observe(navRef.current);
      }
      if (actionsRef.current) {
        resizeObserver.observe(actionsRef.current);
      }
    }

    window.addEventListener('resize', measureLayout);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', measureLayout);
    };
  }, [navigationItems.length, actions.length]);

  useEffect(() => {
    if (layoutMode !== 'mobile') {
      setIsMenuOpen(false);
    }
  }, [layoutMode]);

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
      <header className={`site-header site-header--${layoutMode}`}>
        <div
          ref={innerRef}
          className={`site-header__inner ${
            layoutMode === 'compact' ? 'site-header__inner--compact' : ''
          }`}
        >
          {onBrandClick ? (
            <button
              ref={(node) => {
                brandRef.current = node;
              }}
              type="button"
              onClick={onBrandClick}
              className="site-header__brand"
            >
              <img src={logoSvg} alt="MedViz logo" />
              <span className="site-header__brand-text">
                Med<em>Viz</em>
              </span>
            </button>
          ) : (
            <Link
              ref={(node) => {
                brandRef.current = node;
              }}
              to="/"
              className="site-header__brand"
            >
              <img src={logoSvg} alt="MedViz logo" />
              <span className="site-header__brand-text">
                Med<em>Viz</em>
              </span>
            </Link>
          )}

          <nav ref={navRef} className="site-header__nav">
            {navigationItems.map((item) => renderItem(item))}
          </nav>

          <div ref={actionsRef} className="site-header__actions">
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
