"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function ResetInner() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error ?? "Reset failed");
      return;
    }
    setMsg("Password updated — you can sign in.");
  }

  if (!token) {
    return <p className="text-slate-400">Missing token in URL.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input
        type="password"
        required
        minLength={8}
        placeholder="New password"
        className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none ring-sky-500/40 focus:ring-2"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {err && <p className="text-sm text-rose-300">{err}</p>}
      {msg && <p className="text-sm text-emerald-300">{msg}</p>}
      <button
        type="submit"
        className="w-full rounded-full bg-sky-500 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400"
      >
        Update password
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold text-slate-50">Reset password</h1>
      <Suspense fallback={<p className="mt-6 text-slate-500">Loading…</p>}>
        <div className="mt-8">
          <ResetInner />
        </div>
      </Suspense>
      <p className="mt-8 text-sm text-slate-500">
        <Link href="/login" className="text-sky-400 hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
