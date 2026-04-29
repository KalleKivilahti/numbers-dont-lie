"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export function PrivacyForm() {
  const { update } = useSession();
  const [consentDataProcessing, setConsentDataProcessing] = useState(false);
  const [consentAIInsights, setConsentAIInsights] = useState(false);
  const [shareAnalyticsWithAI, setShareAnalyticsWithAI] = useState(true);
  const [profilePublic, setProfilePublic] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [secret, setSecret] = useState("");
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [enableCode, setEnableCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [twoFaErr, setTwoFaErr] = useState<string | null>(null);
  const [twoFaOk, setTwoFaOk] = useState<string | null>(null);

  const fetchOpts = { credentials: "include" as const };

  useEffect(() => {
    void fetch("/api/profile", fetchOpts)
      .then((r) => r.json())
      .then((d: { privacy?: Record<string, boolean>; twoFactorEnabled?: boolean }) => {
        const p = d.privacy;
        if (!p) return;
        setConsentDataProcessing(p.consentDataProcessing);
        setConsentAIInsights(p.consentAIInsights);
        setShareAnalyticsWithAI(p.shareAnalyticsWithAI);
        setProfilePublic(p.profilePublic);
        setEmailNotifications(p.emailNotifications);
        if (typeof d.twoFactorEnabled === "boolean") {
          setTwoFactorEnabled(d.twoFactorEnabled);
        }
      });
  }, []);

  async function savePrivacy(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/settings/privacy", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        consentDataProcessing,
        consentAIInsights,
        shareAnalyticsWithAI,
        profilePublic,
        emailNotifications,
      }),
    });
    if (!res.ok) {
      setMsg("Could not save privacy settings.");
      return;
    }
    setMsg("Privacy preferences saved.");
  }

  async function setup2fa() {
    setTwoFaErr(null);
    setTwoFaOk(null);
    const res = await fetch("/api/auth/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "setup" }),
    });
    const j = (await res.json()) as { secret?: string; otpauthUrl?: string; error?: string };
    if (!res.ok) {
      setTwoFaErr(j.error ?? "Could not start 2FA setup.");
      return;
    }
    setSecret(j.secret ?? "");
    setOtpauthUrl(j.otpauthUrl ?? "");
    setTwoFaOk("Secret generated — add it to your authenticator app, then enter a code to enable.");
  }

  async function enable2fa(e: React.FormEvent) {
    e.preventDefault();
    setTwoFaErr(null);
    setTwoFaOk(null);
    const res = await fetch("/api/auth/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "enable", code: enableCode.trim(), secret }),
    });
    const j = (await res.json()) as {
      ok?: boolean;
      error?: string;
      fieldErrors?: { code?: string[]; secret?: string[] };
    };
    if (!res.ok) {
      const fe = j.fieldErrors;
      const hint =
        fe?.code?.[0] ??
        fe?.secret?.[0] ??
        j.error ??
        "Enable failed.";
      setTwoFaErr(hint);
      return;
    }
    setTwoFactorEnabled(true);
    setEnableCode("");
    setSecret("");
    setOtpauthUrl("");
    await update({
      sensitiveStepUpVerified: true,
      twoFactorEnabled: true,
    });
    setTwoFaOk("Two-factor authentication is now required when you sign in with email and password.");
  }

  async function disable2fa(e: React.FormEvent) {
    e.preventDefault();
    setTwoFaErr(null);
    setTwoFaOk(null);
    const res = await fetch("/api/auth/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "disable", code: disableCode.trim() }),
    });
    const j = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) {
      setTwoFaErr(j.error ?? "Disable failed.");
      return;
    }
    setTwoFactorEnabled(false);
    setDisableCode("");
    await update({ twoFactorEnabled: false });
    setTwoFaOk("Two-factor authentication disabled.");
  }

  return (
    <div className="space-y-10">
      <form onSubmit={savePrivacy} className="space-y-4 rounded-2xl border border-white/5 bg-white/[0.03] p-6">
        <h2 className="text-lg font-semibold text-slate-100">Consents & visibility</h2>
        <label className="flex items-center gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={consentDataProcessing}
            onChange={(e) => setConsentDataProcessing(e.target.checked)}
          />
          Consent to processing health metrics for platform features (GDPR-aligned pattern).
        </label>
        <label className="flex items-center gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={consentAIInsights}
            onChange={(e) => setConsentAIInsights(e.target.checked)}
          />
          Allow AI-generated insights (uses anonymized payloads only).
        </label>
        <label className="flex items-center gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={shareAnalyticsWithAI}
            onChange={(e) => setShareAnalyticsWithAI(e.target.checked)}
          />
          Include normalized metrics when generating insights.
        </label>
        <label className="flex items-center gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={profilePublic}
            onChange={(e) => setProfilePublic(e.target.checked)}
          />
          Profile visibility flag (placeholder for future social features).
        </label>
        <label className="flex items-center gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={emailNotifications}
            onChange={(e) => setEmailNotifications(e.target.checked)}
          />
          Email notifications (requires SMTP configuration in production).
        </label>
        {msg && <p className="text-sm text-emerald-300">{msg}</p>}
        <button
          type="submit"
          className="rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
        >
          Save privacy preferences
        </button>
      </form>

      <section className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
        <h2 className="text-lg font-semibold text-slate-100">Two-factor authentication</h2>
        <p className="mt-2 text-sm text-slate-400">
          Optional <abbr title="Time-based one-time password">TOTP</abbr>. When enabled, email/password sign-in also asks for a 6-digit code.
          OAuth sign-in is unchanged. Works with any standard authenticator app — for example{" "}
          <strong className="font-medium text-slate-300">Google Authenticator</strong>,{" "}
          <strong className="font-medium text-slate-300">Microsoft Authenticator</strong>,{" "}
          <strong className="font-medium text-slate-300">Authy</strong>, or your password manager if it stores OTPs (1Password,
          Bitwarden, etc.). Add the account using the secret below or “manual entry”.
        </p>

        {twoFactorEnabled ? (
          <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            2FA is <strong>on</strong> for your account.
          </p>
        ) : (
          <p className="mt-4 text-sm text-slate-500">2FA is currently off.</p>
        )}

        {!twoFactorEnabled && (
          <>
            <button
              type="button"
              className="mt-4 rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-100 hover:bg-white/5"
              onClick={() => void setup2fa()}
            >
              Generate secret
            </button>
            {secret && (
              <div className="mt-4 space-y-2 text-xs text-slate-400">
                <p>
                  <strong className="text-slate-200">Secret:</strong>{" "}
                  <span className="font-mono">{secret}</span>
                </p>
                <p className="break-all">
                  <strong className="text-slate-200">otpauth URI:</strong> {otpauthUrl}
                </p>
            <form onSubmit={enable2fa} className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap sm:items-end">
              <input
                className="min-w-[10rem] rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-slate-100"
                placeholder="6-digit code from app"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={enableCode}
                onChange={(e) => setEnableCode(e.target.value)}
              />
              <button
                type="submit"
                disabled={enableCode.replace(/\D/g, "").length < 6 || !secret}
                className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Enable 2FA
              </button>
            </form>
            <p className="text-[11px] text-slate-500">
              Use the <strong>time-based</strong> 6-digit code (changes every 30s), not the secret. Type digits without spaces.
              Microsoft Authenticator: add with <strong>Other</strong> (work/school) → One-time password — paste the secret,
              then enter the current code here. Turn on automatic date/time on your phone if codes fail.
            </p>
              </div>
            )}
          </>
        )}

        {twoFactorEnabled && (
          <form onSubmit={disable2fa} className="mt-6 flex flex-wrap items-end gap-2">
            <input
              className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              placeholder="Current 6-digit code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
            />
            <button
              type="submit"
              className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500"
            >
              Disable 2FA
            </button>
          </form>
        )}

        {twoFaErr && (
          <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            {twoFaErr}
          </p>
        )}
        {twoFaOk && (
          <p className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {twoFaOk}
          </p>
        )}
      </section>
    </div>
  );
}
