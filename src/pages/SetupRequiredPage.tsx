import { Link } from 'react-router';

export default function SetupRequiredPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07111d] px-4 py-12 text-white">
      <section className="w-full max-w-2xl rounded-3xl border border-sky-300/20 bg-[#102740] p-7 shadow-2xl sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300">MedViz local setup</p>
        <h1 className="mt-3 text-3xl font-bold">Cloud features need configuration</h1>
        <p className="mt-4 leading-relaxed text-white/75">
          This local copy has no Supabase project configured. That is expected for a fresh
          clone: the landing page and local 3D demo work without an account or backend.
          Login, saved cases, sharing, and team features need a Supabase project.
        </p>
        <div className="mt-6 rounded-xl bg-black/30 p-4">
          <p className="mb-3 text-sm font-semibold">To enable cloud features:</p>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-white/75">
            <li>Copy <code>.env.example</code> to <code>.env.local</code> in the repository root.</li>
            <li>Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> using your own Supabase project.</li>
            <li>Configure the required tables, storage, and access policies and restart <code>npm run dev</code>.</li>
          </ol>
        </div>
        <p className="mt-4 text-xs text-white/60">
          Do not put service-role keys or private secrets in VITE_ variables.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            to="/demo?local=1"
            className="rounded-xl bg-sky-300 px-5 py-3 text-sm font-bold text-[#06101c]"
          >
            Try the local 3D demo
          </Link>
          <Link
            to="/"
            className="rounded-xl border border-sky-300/30 px-5 py-3 text-sm font-bold text-white"
          >
            Return home
          </Link>
        </div>
      </section>
    </main>
  );
}
