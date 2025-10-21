## Alias

AI-connected operating system for modern small businesses. The app unifies websites, payroll, marketing automation, and MCP-driven workflows under a single control center.

## Branding Palette

| Mode       | Hex      | Notes                               |
|------------|----------|-------------------------------------|
| Dark base  | `#03162d`| Primary dark background             |
| Light base | `#ffffff`| Primary light background            |
| Core 01    | `#0064d6`| Deep Alias blue                     |
| Core 02    | `#23a5fe`| Accent blue for calls to action     |
| Core 03    | `#3eb6fd`| Supporting gradient layer           |
| Support    | `#000000`/`#ffffff` | Text and inverse surfaces |

Future UI work should build gradients and accents around these values to preserve brand consistency.

## Current App Setup

- Layout metadata in `app/layout.tsx` seeds Open Graph, Twitter, and canonical tags, and renders the `logoClear` hero header.
- `next-sitemap` generates static `sitemap.xml`/`robots.txt` during `npm run build`. Set `NEXT_PUBLIC_SITE_URL` (for example `https://alias.app`) to emit correct absolute URLs.
- Email/password auth is handled with NextAuth credentials provider and a Postgres-backed user table (no Prisma). Custom signup/login flows live under `app/auth/*`.
- `scripts/trim-pngs.js` trims transparent padding from PNG assets using Sharp, helping keep logos and UI elements tight.

## Auth & Database

1. **Provision the schema**

   ```sql
   \i db/schema.sql
   ```

   This enables `pgcrypto` and creates the `users` table with audit timestamps.

2. **Environment variables**

   ```
   DATABASE_URL=postgres://...
   AUTH_SECRET=generate-a-long-random-string
   NEXT_PUBLIC_SITE_URL=https://alias.app
   # Option A – Gmail (quick start)
   GMAIL_USER=alias.app@gmail.com
   GMAIL_PASS=app-specific-password

   # Option B – Custom SMTP
   SMTP_HOST=smtp.yourprovider.com
   SMTP_PORT=587
   SMTP_USER=apikey-or-username
   SMTP_PASS=super-secret

   EMAIL_FROM=Alias <no-reply@alias.app>
   ```

   `AUTH_SECRET` (or `NEXTAUTH_SECRET`) is required for JWT signing. Generate one locally with `openssl rand -base64 32`. Provide Gmail or SMTP credentials to deliver verification and password reset emails; when neither is configured the app logs links to the terminal for local testing.

3. **Signup flow**
   - `POST /api/auth/signup` hashes passwords with bcrypt, stores users, and generates an email verification code.
   - Successful requests trigger a verification email. Users confirm at `/auth/verify` before signing in.

4. **Password reset**
   - `POST /api/auth/forgot-password` issues a one-hour reset code and emails a link to `/auth/reset?code=...`.
   - `POST /api/auth/reset-password` validates the code, updates the password, and re-confirms the email address.

5. **Session protection**
   - `middleware.ts` uses `withAuth` to block `/app/*` while unauthenticated.
   - Shared helpers live in `lib/auth.ts` and `lib/db.ts`.

## Required Environment

Copy `.env` as needed and provide production credentials. The sitemap and robots routes fall back to `https://alias.app` when `NEXT_PUBLIC_SITE_URL` is absent.

## Commands

- `npm run dev` – start the Turbopack dev server on port 3000.
- `npm run build` – produce a production build (`next build --turbopack`) and regenerate sitemap outputs.
- `npm run start` – serve the production build.
- `npm run migrate` – apply `db/schema.sql` to the database pointed to by `DATABASE_URL`.
- `npm run lint` – run ESLint with the Next config.
- `npm run trim:pngs` – trim all PNGs under `public` (pass a directory with `npm run trim:pngs -- path/to/dir`).

## Next Steps

- Flesh out authenticated modules within `app/app/*` using the placeholder quick links.
- Broaden account settings so users can manage profile details and regenerate verification emails.
- Add each new route to public navigation and ensure the sitemap captures it.
- Expand component styling further across dark/light modes.
