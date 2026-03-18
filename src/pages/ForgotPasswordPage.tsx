import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { FiAlertCircle, FiArrowRight, FiMail } from 'react-icons/fi';
import type { AuthError } from '@supabase/supabase-js';
import { Link, useSearchParams } from 'react-router';

import SiteHeader from '../components/SiteHeader';
import logoSvg from '../../assets/medviz-logo.svg';
import { useAuth } from '../features/auth/AuthProvider';
import { getSupabaseClient } from '../lib/supabase/client';

export default function ForgotPasswordPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = useMemo(() => searchParams.get('redirectTo') || '/dashboard', [searchParams]);

  useEffect(() => {
    document.body.classList.remove('editor-mode');
    document.title = 'MedViz - Reset Password';
  }, []);

  useEffect(() => {
    if (user?.email) {
      setEmail((currentEmail) => currentEmail || user.email || '');
    }
  }, [user?.email]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('Email is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const client = getSupabaseClient();
      const recoveryUrl = new URL('/reset-password', window.location.origin);
      recoveryUrl.searchParams.set('redirectTo', redirectTo);

      const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: recoveryUrl.toString(),
      });

      if (error) {
        throw error;
      }

      setSuccessMessage('If that email is in MedViz, a password reset link has been sent.');
    } catch (error) {
      const authError = error as AuthError | Error;
      setErrorMessage(authError.message || 'Unable to send the password reset link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-transparent">
      <SiteHeader
        actions={[
          { label: 'Sign In', to: `/login?redirectTo=${encodeURIComponent(redirectTo)}`, variant: 'outline' },
          { label: 'Create Access', to: `/signup?redirectTo=${encodeURIComponent(redirectTo)}`, variant: 'primary' },
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
            Continue Review
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight">Reset your password</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/74">
            Enter your email and we&apos;ll send a link so you can get back to your cases.
          </p>

          <div className="mt-10 rounded-[22px] border border-white/12 bg-white/8 px-4 py-4 backdrop-blur-sm">
            <p className="text-sm leading-6 text-white/74">
              Open the link from your email, choose a new password, and return to review.
            </p>
          </div>
        </section>

        <section className="rounded-[34px] border border-medviz-line/80 bg-[rgba(15,39,69,0.88)] px-8 py-8 text-medviz-ink shadow-[0_24px_70px_rgba(3,10,18,0.4)] backdrop-blur">
          <div className="max-w-xl">
            <p className="font-display text-xs font-bold uppercase tracking-[0.38em] text-medviz-accent">
              Password Help
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-medviz-ink">Send a new link</h2>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-medviz-ink">Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-2xl border border-medviz-line bg-[rgba(9,22,39,0.85)] px-4 py-3 text-sm text-medviz-ink outline-none transition placeholder:text-white/30 focus:border-medviz-accent"
                placeholder="clinician@hospital.org"
              />
            </label>

            {errorMessage ? (
              <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            ) : null}

            {successMessage ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-medviz-accent px-5 py-3 text-sm font-semibold text-[#060f1a] transition hover:bg-[#7ad9ff] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiMail className="h-4 w-4" />
              {isSubmitting ? 'Sending Link...' : 'Send Link'}
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-white/66">
            <Link
              to={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}
              className="font-semibold text-medviz-accent transition hover:text-white"
            >
              Back to sign in
            </Link>
            <span className="text-white/35">|</span>
            <Link
              to={`/signup?redirectTo=${encodeURIComponent(redirectTo)}`}
              className="inline-flex items-center gap-2 font-semibold text-medviz-accent transition hover:text-white"
            >
              Create access
              <FiArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
