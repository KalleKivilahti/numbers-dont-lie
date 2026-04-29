"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [delivery, setDelivery] = useState<"smtp" | "console" | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setMsg(null);
    setDelivery(null);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name: name || undefined }),
    });
    const data = (await res.json()) as {
      message?: string;
      emailDelivery?: "smtp" | "console";
      error?: unknown;
    };
    setLoading(false);
    if (!res.ok) {
      setErr(typeof data.error === "string" ? data.error : "Registration failed");
      return;
    }
    setMsg(data.message ?? "Check your email.");
    setDelivery(data.emailDelivery ?? null);
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold text-slate-50">Create account</h1>
      <p className="mt-2 text-sm text-slate-400">
        Password min 8 chars. After registering you must verify your email before signing in.
        Real messages require SMTP in <code className="text-slate-300">.env</code> — otherwise the link is only printed in the server terminal.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">Display name</label>
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none ring-sky-500/40 focus:ring-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">Email</label>
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none ring-sky-500/40 focus:ring-2"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">Password</label>
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none ring-sky-500/40 focus:ring-2"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {err && (
          <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            {err}
          </p>
        )}
        {msg && (
          <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {msg}
          </p>
        )}
        {delivery === "console" && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-sm text-amber-100">
            <p className="font-medium">No email was sent — SMTP is not configured.</p>
            <p className="mt-2 text-amber-100/90">
              Copy the verification URL from the terminal where <code className="text-amber-50">npm run dev</code> is
              running (look for <code className="text-amber-50">[email:dev]</code> or the HTML link). To receive mail in
              Gmail, set <code className="text-amber-50">SMTP_HOST</code>, <code className="text-amber-50">SMTP_USER</code>, and{" "}
              <code className="text-amber-50">SMTP_PASSWORD</code> (see README).
            </p>
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-sky-500 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60"
        >
          {loading ? "Creating…" : "Register"}
        </button>
      </form>
      <p className="mt-8 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="text-sky-400 hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
