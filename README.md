# Numbers Don’t Lie — Wellness platform

Full-stack Next.js app for a school-style wellness project: accounts & OAuth, health profiles with validation, BMI + weighted wellness score, anonymized AI payloads, snapshot history, AI insights (with graceful fallback), charts, privacy consents, optional TOTP 2FA, and data export.

## Prerequisites

- **Node.js 18.17+** (tested with Node 18; Node 20+ recommended for upstream tooling).
- npm 9+.

## Setup

```bash
cd numbers-dont-lie
cp .env.example .env
# Set NEXTAUTH_SECRET to a long random string, e.g. openssl rand -base64 32
npm install
npx prisma db push
npm run dev
```

Open `http://localhost:3000`.

## Docker (recommended)

From this directory:

```bash
cp .env.example .env
# Set NEXTAUTH_SECRET (required). Optionally SMTP_*, OPENAI_API_KEY, OAuth keys.

docker compose up --build
```

Compose reads variables from a `.env` file next to `docker-compose.yml`. SQLite data persists in the `sqlite_data` volume (`DATABASE_URL=file:/data/dev.db` inside the container).

Equivalent manual Docker:

```bash
docker build -t numbers-dont-lie .

docker run --rm -p 3000:3000 \
  -e NEXTAUTH_URL=http://localhost:3000 \
  -e NEXTAUTH_SECRET="$(openssl rand -base64 32)" \
  -v ndl-data:/data \
  numbers-dont-lie
```

If Docker fails with `docker-credential-desktop.exe` / `exec format error` (common on WSL), edit `~/.docker/config.json` and remove `"credsStore": "desktop"` (or set `"credsStore": ""`).

### Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | SQLite file (default `file:./dev.db`). |
| `NEXTAUTH_URL` | Public URL of the app (e.g. `http://localhost:3000`). |
| `NEXTAUTH_SECRET` | Secret for JWT sessions. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth (optional). Callback: `/api/auth/callback/google`. |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth (optional). Callback: `/api/auth/callback/github`. |
| `OPENAI_API_KEY` | Optional; without it, AI insights use deterministic fallback text. |
| `SMTP_*`, `EMAIL_FROM` | Optional real email delivery for verification & password reset. |

### Email (SMTP)

Without **`SMTP_HOST`**, **`SMTP_USER`**, and **`SMTP_PASSWORD`**, no email is sent: verification and reset links are printed in the **server terminal** only (`[email:dev]`). That is why Gmail stays empty until SMTP is configured.

**Gmail example**

1. Google Account → **Security** → enable **2-Step Verification** → **App passwords** → create one for “Mail” / “Other”.
2. In `.env`:

   - `SMTP_HOST=smtp.gmail.com`
   - `SMTP_PORT=587`
   - `SMTP_SECURE=false`
   - `SMTP_USER=youraddress@gmail.com`
   - `SMTP_PASSWORD=` the generated **app password** (not your normal Gmail password)
   - `EMAIL_FROM=` leave empty or set to the **same** address as `SMTP_USER`

3. Restart `npm run dev` or Docker after changes.

**Troubleshooting (no mail / Gmail)**

- The verification email goes **to the address you typed at registration**, not to “SMTP_USER” by definition — they’re only the same if you signed up with that Gmail.
- **`EMAIL_FROM=noreply@localhost`** (from the sample file) breaks Gmail: the app now treats that placeholder as “unset” and uses **`SMTP_USER` as the sender** when needed.
- Use a Google **App Password** (not your normal login password). Check **Spam**.
- Watch the server log: **`[email] SMTP accepted`** means the provider took the message; **`SMTP send failed`** includes the SMTP error (bad password, blocked, etc.).

After schema changes, run `npx prisma db push` (use `--accept-data-loss` only if you accept resolving duplicate snapshot rows when adding uniqueness).

### OAuth (Google + GitHub)

Auth uses **email/password** (credentials) plus optional **Google** and **GitHub** OAuth when the matching `AUTH_*` variables are set.

**Google Cloud Console**

1. APIs & Services → Credentials → Create OAuth client (Web application).
2. Authorized redirect URI: `{NEXTAUTH_URL}/api/auth/callback/google` (e.g. `http://localhost:3000/api/auth/callback/google`).
3. Copy Client ID / Client secret into `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.

**GitHub**

1. GitHub → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App** (or use a GitHub Organization’s OAuth Apps).
2. Fill in:
   - **Application name**: anything (e.g. “Numbers Don’t Lie”).
   - **Homepage URL**: your app URL (e.g. `http://localhost:3000`).
   - **Authorization callback URL**: **`{NEXTAUTH_URL}/api/auth/callback/github`** — for local dev use  
     `http://localhost:3000/api/auth/callback/github` (must match **NEXTAUTH_URL** exactly).
3. After creating the app, generate a **client secret** if prompted.
4. Put **Client ID** → `AUTH_GITHUB_ID` and **Client Secret** → `AUTH_GITHUB_SECRET` in `.env`, then restart the server.

If login fails with a redirect mismatch, double-check **NEXTAUTH_URL** (no trailing slash) and that the callback URL on GitHub matches `{NEXTAUTH_URL}/api/auth/callback/github` character-for-character.

## API highlights (rubric / checkpoints)

| Endpoint | Purpose |
|----------|---------|
| `POST /api/auth/issue-refresh` | Session cookie required — returns **refresh token** + **HS256 access JWT** (`expiresIn` 900s). |
| `POST /api/auth/refresh` | Body `{ "refreshToken" }` — rotates refresh token and returns **new access JWT**. |
| `GET /api/analytics/summary?period=week\|month` | Weekly/monthly bullets: activity, wellness delta, weight change, goals. |
| `GET /api/health` | Liveness check for Docker/orchestrators. |

**Sessions**: Browser login uses Auth.js **JWT session cookies** (`maxAge` 15 min, sliding `updateAge` 5 min). **`src/middleware.ts`** requires a valid session cookie for `/dashboard`, `/profile`, `/settings`, and for `/api/*` except public routes (`/api/register`, `/api/health`, NextAuth flows under `/api/auth/*`, and **`POST /api/auth/refresh`** which uses a refresh token in the body). Unauthenticated visitors get redirects to `/login` (pages) or **401** (APIs). **Rate limits** (approx. per minute, in-memory): registration ~10, forgot-password ~8, AI insight POST ~25, metrics POST ~45, refresh/issue ~20–30.

## Features (mapping to brief)

- **Auth**: Email/password (bcrypt), **Google OAuth**, JWT sessions via Auth.js (**15 min** max session age / **5 min** sliding update), refresh tokens + **HS256 access JWT** from `/api/auth/issue-refresh` & `/api/auth/refresh`, password reset, email verification, optional TOTP 2FA.
- **Profile**: Zod-validated health fields; export JSON (`GET /api/profile/export`).
- **Privacy**: Consent toggles + audit rows; AI blocked until `consentAIInsights`.
- **Analytics**: BMI + weighted wellness score; **milestones** (weight % bands, activity vs baseline); **comparison** current vs target; **weekly/monthly summaries**.
- **Snapshots**: Unique `(userId, recordedAt)` at **second** precision — duplicates return **409**.
- **AI**: Anonymized payloads; restriction **keyword screening** on LLM output; **cached prior LLM insight** when the provider errors; priority labels; prompts ask for explicit **fitness_goals** references.
- **UI**: Dashboard placeholders while loading; weight chart **goal reference line**; insight **priority** badges + expandable details.
- **Ops**: `docker compose up --build`; Dockerfile standalone image.

## Scripts

- `npm run dev` — development server.
- `npm run build` / `npm start` — production.
- `npm run db:studio` — Prisma Studio on the SQLite file.

## Security notes (assignment-friendly)

- Use **HTTPS** in production (encryption in transit); SQLite file permissions + disk encryption cover “at rest” for local/dev.
- OAuth and AI keys stay server-side; anonymized payloads exclude PII for AI routes.
