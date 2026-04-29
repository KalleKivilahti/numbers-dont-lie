import nodemailer from "nodemailer";

/** Real inbox delivery requires SMTP. Otherwise links are only logged (see {@link sendRawEmail}). */
export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASSWORD?.trim()
  );
}

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  const subject = "Verify your Numbers Don't Lie account";
  const html = `<p>Click to verify:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`;
  await sendRawEmail({ to, subject, html });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const subject = "Reset your password";
  const html = `<p>Reset link (expires in 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`;
  await sendRawEmail({ to, subject, html });
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

async function sendRawEmail(opts: { to: string; subject: string; html: string }) {
  const { to, subject, html } = opts;

  if (isSmtpConfigured()) {
    const host = process.env.SMTP_HOST!.trim();
    const smtpUser = process.env.SMTP_USER!.trim();
    /** Gmail rejects misaligned From:; placeholder EMAIL_FROM breaks delivery — prefer SMTP_USER. */
    let from = process.env.EMAIL_FROM?.trim();
    if (!from || /^noreply@localhost$/i.test(from)) {
      from = smtpUser || "noreply@localhost";
    }

    const looksLikeGmail = /smtp\.gmail\.com|googlemail/i.test(host);
    if (looksLikeGmail && smtpUser.includes("@") && from !== smtpUser) {
      console.warn(
        "[email] For Gmail, EMAIL_FROM should match SMTP_USER (your address). Got EMAIL_FROM=%s SMTP_USER=%s — using SMTP_USER as From.",
        process.env.EMAIL_FROM ?? "(empty)",
        smtpUser
      );
      from = smtpUser;
    }

    const transport = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: { rejectUnauthorized: true },
    });

    try {
      const info = await transport.sendMail({
        from,
        to,
        subject,
        text: stripHtml(html) || subject,
        html,
      });
      console.info("[email] SMTP accepted — to:", to, "from:", from, "messageId:", info.messageId ?? "—");
    } catch (err: unknown) {
      const e = err as NodeJS.ErrnoException & {
        response?: string;
        responseCode?: number;
        command?: string;
      };
      console.error("[email] SMTP send failed — to:", to, {
        message: e?.message,
        code: e?.code,
        responseCode: e?.responseCode,
        response: e?.response,
        command: e?.command,
      });
      throw err;
    }
    return;
  }

  console.info("[email:dev] (no SMTP_*) — mail would go to:", opts.to, opts.subject);
  console.info(opts.html);
}
