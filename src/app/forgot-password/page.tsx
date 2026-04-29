"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<"smtp" | "console" | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setDelivery(null);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = (await res.json()) as {
      message?: string;
      emailDelivery?: "smtp" | "console";
    };
    setLoading(false);
    setMsg(data.message ?? "Done.");
    setDelivery(data.emailDelivery ?? null);
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold text-slate-50">Forgot password</h1>
      <p className="mt-2 text-sm text-slate-400">
        We&apos;ll email a reset link if the account exists. Without SMTP, check the server terminal for the link.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <input
          type="email"
          required
          placeholder="you@example.com"
          className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none ring-sky-500/40 focus:ring-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-sky-500 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60"
        >
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>
      {msg && <p className="mt-4 text-sm text-slate-300">{msg}</p>}
      {delivery === "console" && (
        <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-sm text-amber-100">
          <p>
            SMTP not configured — open the terminal running the app and find the reset URL (or configure SMTP in{" "}
            <code className="text-amber-50">.env</code>).
          </p>
        </div>
      )}
      <p className="mt-8 text-sm text-slate-500">
        <Link href="/login" className="text-sky-400 hover:underline">
          Back to login
        </Link>
      </p>
    </main>
  );
}
