import { useEffect, useState, type FormEvent } from 'react';
import { FiAlertCircle, FiArrowLeft } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router';

import SiteHeader from '../components/SiteHeader';
import logoSvg from '../../assets/medviz-logo.svg';
import { createCase, createLocalCase } from '../features/cases';
import { getStorageMode } from '../features/settings/storagePreference';
import { warmEditorExperience } from './preload';

export default function CreateCasePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.body.classList.remove('editor-mode');
    document.title = 'MedViz - New Case';
    void warmEditorExperience();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim()) {
      setErrorMessage('Case title is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const storageMode = getStorageMode();
      const createdCase =
        storageMode === 'local'
          ? createLocalCase({ title, description })
          : await createCase({ title, description });
      await warmEditorExperience();
      navigate(`/editor?caseId=${createdCase.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create the clinical case.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
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
                  New Case
                </p>
                <h1 className="mt-2 font-display text-4xl font-bold text-medviz-ink">Start a new case</h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68">
                  Add the case title and review notes now. You can add the patient model after the case opens in 3D review.
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

        <form className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]" onSubmit={handleSubmit}>
          <section className="rounded-[34px] border border-medviz-line/80 bg-[rgba(15,39,69,0.88)] px-6 py-7 shadow-[0_24px_70px_rgba(3,10,18,0.4)] backdrop-blur lg:px-8">
            <div className="space-y-6">
              <div>
                <p className="font-display text-xs font-bold uppercase tracking-[0.4em] text-medviz-accent">
                  Case Details
                </p>
                <h2 className="mt-3 font-display text-3xl font-bold text-medviz-ink">Case information</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68">
                  Keep this brief. You can return later to continue the review and add the model from inside 3D review.
                </p>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-medviz-ink">Case title</span>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={200}
                  disabled={isSubmitting}
                  placeholder="Post-op tibial reconstruction review"
                  className="w-full rounded-2xl border border-medviz-line bg-[rgba(9,22,39,0.85)] px-4 py-3 text-sm text-medviz-ink outline-none transition placeholder:text-white/30 focus:border-medviz-accent"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-medviz-ink">Description</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={isSubmitting}
                  rows={8}
                  placeholder="Clinical notes, anatomy summary, or procedure context."
                  className="w-full rounded-2xl border border-medviz-line bg-[rgba(9,22,39,0.85)] px-4 py-3 text-sm leading-6 text-medviz-ink outline-none transition placeholder:text-white/30 focus:border-medviz-accent"
                />
              </label>

            {errorMessage ? (
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            ) : null}
            </div>
          </section>

          <aside className="rounded-[34px] border border-medviz-line/80 bg-[linear-gradient(160deg,rgba(9,22,39,0.98),rgba(15,39,69,0.96))] px-6 py-7 text-white shadow-[0_30px_80px_rgba(3,10,18,0.45)] lg:px-8">
            <div>
              <p className="font-display text-xs font-bold uppercase tracking-[0.4em] text-medviz-gold">
                3D Review
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold">Add the model next</h2>
              <p className="mt-4 text-sm leading-7 text-white/74">
                After you create the case, MedViz opens the review workspace where you can import the STL, OBJ, or PLY file for this patient.
              </p>
            </div>

            <div className="mt-8 rounded-[24px] border border-white/14 bg-white/8 p-5 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/52">Case status</p>
              <p className="mt-3 text-sm leading-6 text-white/74">This case starts as private and is ready for model import after creation.</p>
            </div>

            <div className="mt-6 rounded-[28px] border border-dashed border-medviz-accent/35 bg-[rgba(15,39,69,0.78)] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/52">Next step</p>
              <h3 className="mt-3 font-display text-2xl font-bold">Create case, then import model</h3>
              <p className="mt-4 text-sm leading-7 text-white/72">
                This keeps case setup quick and lets you choose the patient model from inside the review workspace.
              </p>
            </div>

            <div className="mt-8 border-t border-white/10 pt-6">
              <div className="text-sm text-white/58">
                {isSubmitting ? 'Preparing the case...' : 'The patient model will be added from inside 3D review.'}
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center rounded-full border border-white/18 px-5 py-3 text-sm font-semibold text-white transition hover:border-medviz-accent hover:text-medviz-accent"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-full bg-medviz-accent px-5 py-3 text-sm font-semibold text-[#060f1a] transition hover:bg-[#7ad9ff] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Opening Review...' : 'Create Case'}
                </button>
              </div>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}
