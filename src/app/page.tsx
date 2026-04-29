import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-400/90">
          Numbers Don&apos;t Lie
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-50 sm:text-5xl">
          Wellness profiles, analytics, and AI insights — built for learning.
        </h1>
        <p className="mt-6 text-lg text-slate-400">
          Collect normalized health data, compute BMI & wellness scores, visualize
          progress, and generate anonymized AI recommendations with consent controls.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/25 transition hover:bg-sky-400"
          >
            Create account
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-slate-600 px-6 py-3 text-sm font-semibold text-slate-100 hover:border-slate-400"
          >
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-slate-500 underline-offset-4 hover:text-slate-300 hover:underline"
          >
            Dashboard (requires login)
          </Link>
        </div>
        <ul className="mt-16 grid gap-4 text-left text-sm text-slate-400 sm:grid-cols-3">
          <li className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
            <strong className="block text-slate-200">Profiles</strong>
            Demographics, metrics, goals, assessments — validated & exportable.
          </li>
          <li className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
            <strong className="block text-slate-200">Analytics</strong>
            BMI bands, weighted wellness score, trend snapshots.
          </li>
          <li className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
            <strong className="block text-slate-200">AI + charts</strong>
            Insight history with versioning; graceful fallback without API keys.
          </li>
        </ul>
      </div>
    </main>
  );
}
