"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export function TopNav() {
  const { data } = useSession();

  return (
    <header className="sticky top-0 z-10 border-b border-white/5 bg-[#0f1419]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-sm font-semibold tracking-tight text-slate-100">
          Numbers Don&apos;t Lie
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
          {data?.user ? (
            <>
              <Link href="/dashboard" className="hover:text-sky-300">
                Dashboard
              </Link>
              <Link href="/profile" className="hover:text-sky-300">
                Profile
              </Link>
              <Link href="/settings/privacy" className="hover:text-sky-300">
                Privacy &amp; 2FA
              </Link>
              <button
                type="button"
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200 hover:bg-white/5"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-sky-300">
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-sky-500 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-sky-400"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
