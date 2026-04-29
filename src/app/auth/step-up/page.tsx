"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

function StepUpInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { update } = useSession();
  const callbackUrl = params.get("callbackUrl") || "/settings/privacy";

  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const res = await fetch("/api/auth/step-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ code: code.replace(/\D/g, "").slice(0, 6) }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setLoading(false);
      setErr(data.error ?? "Verification failed.");
      return;
    }
    await update({ sensitiveStepUpVerified: true });
    setLoading(false);
    router.push(callbackUrl.startsWith("/") ? callbackUrl : "/settings/privacy");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold text-slate-50">Verify it&apos;s you</h1>
      <p className="mt-2 text-sm text-slate-400">
        Your account uses two-factor authentication. Enter the 6-digit code from your authenticator app to open{" "}
        <strong className="text-slate-300">Profile</strong> and <strong className="text-slate-300">Privacy</strong>{" "}
        settings.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <input
          className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none ring-sky-500/40 focus:ring-2"
          placeholder="6-digit code"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoFocus
        />
        {err && (
          <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{err}</p>
        )}
        <button
          type="submit"
          disabled={loading || code.replace(/\D/g, "").length < 6}
          className="w-full rounded-full bg-sky-500 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-50"
        >
          {loading ? "Checking…" : "Continue"}
        </button>
      </form>
      <p className="mt-8 text-center text-sm text-slate-500">
        <Link href="/dashboard" className="text-sky-400 hover:underline">
          Back to dashboard
        </Link>
      </p>
    </main>
  );
}

export default function StepUpPage() {
  return (
    <Suspense fallback={<p className="px-6 py-16 text-slate-400">Loading…</p>}>
      <StepUpInner />
    </Suspense>
  );
}
