import { PrivacyForm } from "./privacy-form";

export default function PrivacySettingsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold text-slate-50">Privacy &amp; security</h1>
      <p className="mt-2 text-slate-400">
        Grant explicit consents, control AI data sharing flags, and optionally enable TOTP-based
        two-factor authentication for credential logins.
      </p>
      <div className="mt-10">
        <PrivacyForm />
      </div>
    </main>
  );
}
