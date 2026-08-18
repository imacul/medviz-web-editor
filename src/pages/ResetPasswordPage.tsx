import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { FiAlertCircle, FiArrowRight, FiCheckCircle, FiLock } from 'react-icons/fi';
import type { AuthError } from '@supabase/supabase-js';
import { Link, useNavigate, useSearchParams } from 'react-router';

import SiteHeader from '../components/SiteHeader';
import logoSvg from '../../assets/medviz-logo.svg';
import { useAuth } from '../features/auth/AuthProvider';
import { getSupabaseClient } from '../lib/supabase/client';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLoading, user } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkIssue, setLinkIssue] = useState<{ isExpired: boolean; description: string | null } | null>(null);
  const [isRecoveryVerified, setIsRecoveryVerified] = useState(false);

  const redirectTo = useMemo(() => searchParams.get('redirectTo') || '/dashboard', [searchParams]);

  useEffect(() => {
    document.body.classList.remove('editor-mode');
    document.title = 'MedViz - Choose New Password';
  }, []);

  // Supabase redirects here with either a recovery token in the URL hash (exchanged
  // automatically by detectSessionInUrl) or, for an expired/reused link, an error in the hash.
  // This only reads the hash to drive UI state — it must not mutate window.location/history,
  // since that would race with the Supabase client's own detectSessionInUrl handler, which
  // needs the untouched hash to exchange a valid recovery token into a session. Supabase's
  // client already cleans up the hash itself once it has finished processing it.
  useEffect(() => {
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
    const hashParams = new URLSearchParams(hash);
    const errorCode = hashParams.get('error_code');
    const errorDescription = hashParams.get('error_description');

    if (errorCode) {
      setLinkIssue({
        isExpired: errorCode === 'otp_expired',
        description: errorDescription ? errorDescription.replace(/\+/g, ' ') : null,
      });
    }
  }, []);

  useEffect(() => {
    const client = getSupabaseClient();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryVerified(true);
        setLinkIssue(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const client = getSupabaseClient();
      const { error } = await client.auth.updateUser({ password });

      if (error) {
        throw error;
      }

      setSuccessMessage('Your password has been updated.');
      setPassword('');
      setConfirmPassword('');
      window.setTimeout(() => {
        navigate(redirectTo, { replace: true });
      }, 1200);
    } catch (error) {
      const authError = error as AuthError | Error;
      setErrorMessage(authError.message || 'Unable to update your password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center px-4">
        <div className="rounded-[30px] border border-medviz-line bg-[rgba(15,39,69,0.9)] px-8 py-10 text-center shadow-[0_24px_60px_rgba(3,10,18,0.4)] backdrop-blur">
          <p className="font-display text-sm font-bold uppercase tracking-[0.4em] text-medviz-accent">
            MedViz
          </p>
          <h1 className="mt-4 font-display text-3xl font-bold text-medviz-ink">Opening password help</h1>
        </div>
      </div>
    );
  }

  if (!user) {
    const heading = linkIssue
      ? linkIssue.isExpired
        ? 'This link has expired'
        : 'This link is no longer valid'
      : 'Open the link from your email';
    const description = linkIssue
      ? 'Password reset links can only be used once and expire after a short time. Request a new one to continue.'
      : 'Use the latest link from your email to choose a new password and return to your cases.';

    return (
      <div className="min-h-full bg-transparent px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[34px] border border-medviz-line/80 bg-[rgba(15,39,69,0.9)] px-8 py-10 text-center text-medviz-ink shadow-[0_24px_70px_rgba(3,10,18,0.4)] backdrop-blur">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] border border-medviz-line bg-[rgba(9,22,39,0.9)]">
            {linkIssue ? (
              <FiAlertCircle className="h-7 w-7 text-rose-300" />
            ) : (
              <img src={logoSvg} alt="MedViz logo" className="h-8 w-8 object-contain" />
            )}
          </div>
          <p className="mt-6 font-display text-xs font-bold uppercase tracking-[0.4em] text-medviz-accent">
            Password Reset
          </p>
          <h1 className="mt-4 font-display text-3xl font-bold text-medviz-ink">{heading}</h1>
          <p className="mt-3 text-sm leading-7 text-white/68">{description}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to={`/forgot-password?redirectTo=${encodeURIComponent(redirectTo)}`}
              className="rounded-full bg-medviz-accent px-5 py-3 text-sm font-semibold text-[#060f1a] transition hover:bg-[#7ad9ff]"
            >
              Send New Link
            </Link>
            <Link
              to={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}
              className="inline-flex items-center gap-2 rounded-full border border-medviz-line bg-[rgba(9,22,39,0.85)] px-5 py-3 text-sm font-semibold text-medviz-ink transition hover:border-medviz-accent hover:text-medviz-accent"
            >
              Back to sign in
              <FiArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-transparent">
      <SiteHeader
        actions={[
          { label: 'Sign In', to: `/login?redirectTo=${encodeURIComponent(redirectTo)}`, variant: 'outline' },
        ]}
      />

      <div className="mx-auto grid min-h-full max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <section className="rounded-[34px] border border-medviz-line/80 bg-[linear-gradient(160deg,rgba(9,22,39,0.98),rgba(15,39,69,0.96))] px-8 py-8 text-white shadow-[0_30px_80px_rgba(3,10,18,0.45)]">
          <div className="inline-flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-[16px] border border-medviz-line bg-white/5">
              <img src={logoSvg} alt="MedViz logo" className="h-7 w-7 object-contain" />
            </span>
            <span>
              <span className="block font-display text-xl font-bold">MedViz</span>
              <span className="block text-xs uppercase tracking-[0.35em] text-white/55">Password Help</span>
            </span>
          </div>

          <p className="mt-10 font-display text-xs font-bold uppercase tracking-[0.42em] text-medviz-gold">
            Return to Cases
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight">Set a new password</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/74">
            Choose a new password, then continue reviewing your saved cases.
          </p>

          <div className="mt-10 rounded-[22px] border border-white/12 bg-white/8 px-4 py-4 backdrop-blur-sm">
            <p className="text-sm leading-6 text-white/74">
              Once saved, you&apos;ll return to the case you wanted to open.
            </p>
          </div>
        </section>

        <section className="rounded-[34px] border border-medviz-line/80 bg-[rgba(15,39,69,0.88)] px-8 py-8 text-medviz-ink shadow-[0_24px_70px_rgba(3,10,18,0.4)] backdrop-blur">
          <div className="max-w-xl">
            <p className="font-display text-xs font-bold uppercase tracking-[0.38em] text-medviz-accent">
              Password Help
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-medviz-ink">Save a new password</h2>
            {isRecoveryVerified ? (
              <p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <FiCheckCircle className="h-3.5 w-3.5" />
                Recovery link verified
              </p>
            ) : null}
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-medviz-ink">New password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-2xl border border-medviz-line bg-[rgba(9,22,39,0.85)] px-4 py-3 text-sm text-medviz-ink outline-none transition placeholder:text-white/30 focus:border-medviz-accent"
                placeholder="At least 6 characters"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-medviz-ink">Confirm password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-2xl border border-medviz-line bg-[rgba(9,22,39,0.85)] px-4 py-3 text-sm text-medviz-ink outline-none transition placeholder:text-white/30 focus:border-medviz-accent"
                placeholder="Repeat your password"
              />
            </label>

            {errorMessage ? (
              <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            ) : null}

            {successMessage ? (
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-medviz-accent px-5 py-3 text-sm font-semibold text-[#060f1a] transition hover:bg-[#7ad9ff] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiLock className="h-4 w-4" />
              {isSubmitting ? 'Saving Password...' : 'Save New Password'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
