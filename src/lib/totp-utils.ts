import { Secret, TOTP } from "otpauth";

const DIGITS = 6;
const PERIOD = 30;
/** Accounts for phone/server clock drift (seconds → ±window × period). */
const WINDOW = 5;

/** Microsoft Authenticator manual entry sometimes uses SHA256; standard URI uses SHA1 — accept both. */
const ALGORITHMS = ["SHA1", "SHA256"] as const;

/**
 * Keep only digits so pasted codes like "123 456" or copied with spaces still validate.
 * otpauth rejects tokens whose length ≠ digits.
 */
export function normalizeAuthenticatorCode(input: string): string {
  return input.replace(/\D/g, "").slice(0, DIGITS);
}

/** Strip grouping spaces / fix casing before base32 decode (Authenticator apps often insert spaces). */
export function secretFromBase32Input(raw: string): Secret {
  const cleaned = raw.replace(/\s+/g, "").replace(/=/g, "").toUpperCase();
  return Secret.fromBase32(cleaned);
}

export function validateTotpToken(secretBase32: string, tokenInput: string): boolean {
  const token = normalizeAuthenticatorCode(tokenInput);
  if (token.length !== DIGITS) return false;

  let secret: Secret;
  try {
    secret = secretFromBase32Input(secretBase32);
  } catch {
    return false;
  }

  for (const algorithm of ALGORITHMS) {
    const totp = new TOTP({
      issuer: "NumbersDontLie",
      label: "account",
      algorithm,
      digits: DIGITS,
      period: PERIOD,
      secret,
    });
    if (totp.validate({ token, window: WINDOW }) !== null) return true;
  }
  return false;
}
