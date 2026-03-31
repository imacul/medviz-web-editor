import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { FiAlertCircle, FiArrowRight, FiLock, FiMail, FiUserPlus } from 'react-icons/fi';
import type { AuthError } from '@supabase/supabase-js';
import { Link, useNavigate, useSearchParams } from 'react-router';

import SiteHeader from '../components/SiteHeader';
import logoSvg from '../../assets/medviz-logo.svg';
import { useAuth } from '../features/auth/AuthProvider';
import { appendSource, trackEvent } from '../lib/analytics';
import { getSupabaseClient } from '../lib/supabase/client';

interface AuthPageProps {
  mode: 'login' | 'signup';
}

const COPY = {
  login: {
    eyebrow: 'Continue Review',
    title: 'Open your cases',
    submit: 'Continue',
    alternateText: 'New to MedViz?',
    alternateCta: 'Create access',
    alternateHref: '/signup',
    intro: 'Return to saved cases, open a patient model, and continue your review.',
  },
  signup: {
    eyebrow: 'Start Review',
    title: 'Begin with MedViz',
    submit: 'Create Access',
    alternateText: 'Already using MedViz?',
    alternateCta: 'Sign in',
    alternateHref: '/login',
    intro: 'Create your sign-in to review cases, view patient models, and return later.',
  },
} as const;

export default function AuthPage({ mode }: AuthPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = useMemo(() => searchParams.get('redirectTo') || '/dashboard', [searchParams]);
  const source = useMemo(() => searchParams.get('src') || 'direct', [searchParams]);
  const copy = COPY[mode];
  const alternateHref = useMemo(
    () => appendSource(`${copy.alternateHref}?redirectTo=${encodeURIComponent(redirectTo)}`, source),
    [copy.alternateHref, redirectTo, source]
  );
  const forgotPasswordHref = useMemo(
    () => appendSource(`/forgot-password?redirectTo=${encodeURIComponent(redirectTo)}`, source),
    [redirectTo, source]
  );

  useEffect(() => {
    document.body.classList.remove('editor-mode');
    document.title = mode === 'login' ? 'MedViz - Sign In' : 'MedViz - Sign Up';
  }, [mode]);

  useEffect(() => {
    trackEvent('auth_view', { mode, source });
  }, [mode, source]);

  useEffect(() => {
    if (!isLoading && user) {
      navigate(redirectTo, { replace: true });
    }
  }, [isLoading, navigate, redirectTo, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('Email is required.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    trackEvent('auth_submit', { mode, source });

    try {
      const client = getSupabaseClient();

      if (mode === 'login') {
        const { error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          throw error;
        }

        trackEvent('auth_success', { mode, source });
        navigate(redirectTo, { replace: true });
      } else {
        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          trackEvent('auth_success', { mode, source });
          navigate(redirectTo, { replace: true });
        } else {
          trackEvent('auth_success', { mode: 'signup_pending', source });
          setSuccessMessage('Check your email, then return to begin reviewing cases.');
          setPassword('');
          setConfirmPassword('');
        }
      }
    } catch (error) {
      const authError = error as AuthError | Error;
      trackEvent('auth_error', { mode, source });
      setErrorMessage(authError.message || 'Unable to continue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-transparent">
      <SiteHeader
        actions={[
          mode === 'login'
            ? { label: 'Create Access', to: appendSource(`/signup?redirectTo=${encodeURIComponent(redirectTo)}`, source), variant: 'primary' }
            : { label: 'Sign In', to: appendSource(`/login?redirectTo=${encodeURIComponent(redirectTo)}`, source), variant: 'outline' },
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
              <span className="block text-xs uppercase tracking-[0.35em] text-white/55">Case Review</span>
            </span>
          </div>

          <p className="mt-10 font-display text-xs font-bold uppercase tracking-[0.42em] text-medviz-gold">
            {copy.eyebrow}
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight">{copy.title}</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/74">{copy.intro}</p>

          <div className="mt-10 space-y-4">
            <AuthFeature icon={<FiLock className="h-4 w-4" />} text="Open saved cases and return to the same review without losing your place." />
            <AuthFeature icon={<FiMail className="h-4 w-4" />} text="Use your email to reopen cases from any browser in the clinic or theatre." />
            <AuthFeature icon={<FiUserPlus className="h-4 w-4" />} text="Move straight into viewing, measuring, and annotating the patient model." />
          </div>
        </section>

        <section className="rounded-[34px] border border-medviz-line/80 bg-[rgba(15,39,69,0.88)] px-8 py-8 text-medviz-ink shadow-[0_24px_70px_rgba(3,10,18,0.4)] backdrop-blur">
          <div className="max-w-xl">
            <p className="font-display text-xs font-bold uppercase tracking-[0.38em] text-medviz-accent">
              {copy.eyebrow}
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-medviz-ink">{copy.title}</h2>
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

            {mode === 'login' ? (
              <div className="text-right text-sm">
                <Link
                  to={forgotPasswordHref}
                className="font-semibold text-medviz-accent transition hover:text-white"
              >
                Forgot password?
              </Link>
              </div>
            ) : null}

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-medviz-ink">Password</span>
              <input
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-2xl border border-medviz-line bg-[rgba(9,22,39,0.85)] px-4 py-3 text-sm text-medviz-ink outline-none transition placeholder:text-white/30 focus:border-medviz-accent"
                placeholder="At least 6 characters"
              />
            </label>

            {mode === 'signup' ? (
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
            ) : null}

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
              {copy.submit}
              <FiArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-6 text-sm text-white/66">
            {copy.alternateText}{' '}
            <Link
              to={alternateHref}
              className="font-semibold text-medviz-accent transition hover:text-white"
            >
              {copy.alternateCta}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function AuthFeature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[22px] border border-white/12 bg-white/8 px-4 py-4 backdrop-blur-sm">
      <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-medviz-gold">
        {icon}
      </span>
      <p className="text-sm leading-6 text-white/74">{text}</p>
    </div>
  );
}
