import { useEffect, useState } from 'react';
import { FiArrowLeft, FiCloud, FiHardDrive } from 'react-icons/fi';
import { Link } from 'react-router';

import SiteHeader from '../components/SiteHeader';
import logoSvg from '../../assets/medviz-logo.svg';
import {
  getStorageMode,
  setStorageMode,
  type StorageMode,
} from '../features/settings/storagePreference';

export default function SettingsPage() {
  const [mode, setMode] = useState<StorageMode>(() => getStorageMode());

  useEffect(() => {
    document.body.classList.remove('editor-mode');
    document.title = 'MedViz - Settings';
  }, []);

  const handleModeChange = (newMode: StorageMode) => {
    setStorageMode(newMode);
    setMode(newMode);
  };

  return (
    <div className="min-h-full bg-transparent">
      <SiteHeader
        actions={[
          { label: 'Case List', to: '/dashboard', variant: 'outline' },
        ]}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-[34px] border border-medviz-line/80 bg-[rgba(15,39,69,0.9)] px-6 py-6 shadow-[0_24px_70px_rgba(3,10,18,0.4)] backdrop-blur lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-medviz-line bg-[rgba(9,22,39,0.9)]">
                <img src={logoSvg} alt="MedViz logo" className="h-8 w-8 object-contain" />
              </div>
              <div>
                <p className="font-display text-xs font-bold uppercase tracking-[0.4em] text-medviz-accent">
                  Account
                </p>
                <h1 className="mt-2 font-display text-4xl font-bold text-medviz-ink">Settings</h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68">
                  Manage how MedViz stores your cases and patient models.
                </p>
              </div>
            </div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-medviz-line bg-[rgba(9,22,39,0.85)] px-5 py-3 text-sm font-semibold text-medviz-ink transition hover:border-medviz-accent hover:text-medviz-accent"
            >
              <FiArrowLeft className="h-4 w-4" />
              Case List
            </Link>
          </div>
        </header>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[34px] border border-medviz-line/80 bg-[rgba(15,39,69,0.88)] px-6 py-7 shadow-[0_24px_70px_rgba(3,10,18,0.4)] backdrop-blur lg:px-8">
            <p className="font-display text-xs font-bold uppercase tracking-[0.4em] text-medviz-accent">
              Data Storage
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-medviz-ink">
              Where cases are saved
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68">
              Choose where new cases and patient models are stored. This applies to cases you create
              after changing this setting.
            </p>

            <div className="mt-8 space-y-4">
              <button
                type="button"
                onClick={() => handleModeChange('cloud')}
                className={`w-full cursor-pointer rounded-[24px] border px-5 py-5 text-left transition ${
                  mode === 'cloud'
                    ? 'border-medviz-accent bg-[rgba(79,174,255,0.08)]'
                    : 'border-medviz-line/80 bg-[rgba(9,22,39,0.85)] hover:border-medviz-line'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                      mode === 'cloud'
                        ? 'border-medviz-accent bg-[rgba(79,174,255,0.15)] text-medviz-accent'
                        : 'border-medviz-line bg-[rgba(15,39,69,0.9)] text-white/50'
                    }`}
                  >
                    <FiCloud className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-display text-lg font-bold text-medviz-ink">
                        Cloud Storage
                      </span>
                      {mode === 'cloud' && (
                        <span className="rounded-full bg-medviz-accent px-2.5 py-0.5 text-[11px] font-bold text-[#060f1a]">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-white/65">
                      Cases and patient models are saved to your account. Access from any device,
                      anytime.
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('local')}
                className={`w-full cursor-pointer rounded-[24px] border px-5 py-5 text-left transition ${
                  mode === 'local'
                    ? 'border-medviz-gold bg-[rgba(255,197,76,0.06)]'
                    : 'border-medviz-line/80 bg-[rgba(9,22,39,0.85)] hover:border-medviz-line'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                      mode === 'local'
                        ? 'border-medviz-gold bg-[rgba(255,197,76,0.12)] text-medviz-gold'
                        : 'border-medviz-line bg-[rgba(15,39,69,0.9)] text-white/50'
                    }`}
                  >
                    <FiHardDrive className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-display text-lg font-bold text-medviz-ink">
                        Browser Only
                      </span>
                      {mode === 'local' && (
                        <span className="rounded-full bg-medviz-gold px-2.5 py-0.5 text-[11px] font-bold text-[#060f1a]">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-white/65">
                      Cases and models are stored only in this browser. Nothing is uploaded to our
                      servers.
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {mode === 'local' && (
              <div className="mt-6 rounded-2xl border border-amber-400/30 bg-[rgba(255,197,76,0.07)] px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-400">
                  Heads up
                </p>
                <p className="mt-2 text-sm leading-6 text-white/72">
                  Cases saved in browser-only mode cannot be accessed from other devices. Clearing
                  your browser data or switching browsers will permanently delete them.
                </p>
              </div>
            )}
          </section>

          <aside className="rounded-[34px] border border-medviz-line/80 bg-[linear-gradient(160deg,rgba(9,22,39,0.98),rgba(15,39,69,0.96))] px-6 py-7 text-white shadow-[0_30px_80px_rgba(3,10,18,0.45)] lg:px-8">
            <p className="font-display text-xs font-bold uppercase tracking-[0.4em] text-medviz-gold">
              Privacy
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold">Your data, your call</h2>
            <p className="mt-4 text-sm leading-7 text-white/74">
              If your institution has data governance requirements or you prefer complete local
              control, switch to Browser Only. No patient data will leave your device.
            </p>
            <ul className="mt-8 space-y-4 text-sm leading-6 text-white/72">
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-medviz-accent" />
                This setting applies to new cases only. Existing cloud cases are not affected.
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-medviz-gold" />
                You can switch back to cloud storage at any time.
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-medviz-accent" />
                Browser-only cases are visible only on this device in this browser.
              </li>
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}
