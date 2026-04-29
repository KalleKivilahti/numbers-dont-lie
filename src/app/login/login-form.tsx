"use client";

import { useState, useEffect } from "react";
import { signIn, getProviders } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const verified = searchParams.get("verified");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthIds, setOauthIds] = useState<string[]>([]);

  useEffect(() => {
    void getProviders().then((p) => {
      if (p) setOauthIds(Object.keys(p).filter((k) => k !== "credentials"));
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
      totp: totp || undefined,
      callbackUrl,
    });
    setLoading(false);
    if (res?.error) {
      setError(res.error === "CredentialsSignin" ? "Invalid credentials" : res.error);
      return;
    }
    window.location.href = callbackUrl;
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold text-slate-50">Sign in</h1>
      <p className="mt-2 text-sm text-slate-400">
        Email & password, OAuth (when configured), optional authenticator code if 2FA is on.
      </p>
      {oauthIds.length > 0 && (
        <p className="mt-2 text-xs text-sky-300/90">
          Active OAuth modules: {oauthIds.join(", ")}
        </p>
      )}
      {verified === "1" && (
        <p className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          Email verified — you can sign in.
        </p>
      )}
      {verified === "0" && (
        <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          Verification link invalid or expired.
        </p>
      )}
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">Email</label>
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none ring-sky-500/40 focus:ring-2"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">Password</label>
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none ring-sky-500/40 focus:ring-2"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">
            Authenticator code (if 2FA enabled)
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none ring-sky-500/40 focus:ring-2"
            inputMode="numeric"
            placeholder="123456"
            value={totp}
            onChange={(e) => setTotp(e.target.value)}
          />
        </div>
        {error && (
          <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-sky-500 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Continue"}
        </button>
      </form>

      <div className="mt-8 space-y-3">
        <p className="text-center text-xs text-slate-500">OAuth providers</p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="rounded-lg border border-white/10 bg-white/[0.04] py-2 text-sm text-slate-100 hover:bg-white/[0.08]"
            onClick={() => signIn("google", { callbackUrl })}
          >
            Continue with Google
          </button>
          <button
            type="button"
            className="rounded-lg border border-white/10 bg-white/[0.04] py-2 text-sm text-slate-100 hover:bg-white/[0.08]"
            onClick={() => signIn("github", { callbackUrl })}
          >
            Continue with GitHub
          </button>
        </div>
        <p className="text-center text-[11px] text-slate-600">
          Set <code className="text-slate-400">AUTH_*_ID</code> /{" "}
          <code className="text-slate-400">AUTH_*_SECRET</code> in{" "}
          <code className="text-slate-400">.env</code> for OAuth. JWT sessions are issued by
          NextAuth; refresh tokens via{" "}
          <code className="text-slate-400">/api/auth/issue-refresh</code>.
        </p>
      </div>

      <p className="mt-8 text-center text-sm text-slate-500">
        <Link href="/forgot-password" className="underline-offset-4 hover:underline">
          Forgot password
        </Link>
        {" · "}
        <Link href="/register" className="underline-offset-4 hover:underline">
          Register
        </Link>
      </p>
    </main>
  );
}
