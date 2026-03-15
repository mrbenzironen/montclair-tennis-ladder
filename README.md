# Montclair Tennis Ladder

A Progressive Web App for competitive tennis ladder play in Montclair, NJ.

## Tech Stack

- **React 18 + TypeScript + Vite** — frontend
- **Supabase** — database, auth, realtime, storage, edge functions
- **Twilio** — SMS notifications
- **Vercel** — hosting + CI/CD

---

## Setup Instructions

### Step 1 — Clone the repo

```bash
git clone https://github.com/mrbenzironen/montclair-tennis-ladder.git
cd montclair-tennis-ladder
npm install
```

### Step 2 — Create your Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Name it `montclair-tennis-ladder`, choose **US East** region
3. Wait for provisioning (~2 min)
4. Go to **Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

### Step 3 — Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Step 4 — Run the database migration

1. In Supabase, go to **SQL Editor**
2. Open `supabase/migrations/001_schema.sql`
3. Paste the entire contents and click **Run**

### Step 5 — Enable Auth providers

In Supabase → **Authentication → Providers**:
- Enable **Google** (add OAuth credentials from Google Cloud Console)
- Enable **Apple** (requires Apple Developer account)
- Email/Password is enabled by default

### Step 6 — Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Deploying to Vercel

### Step 1 — Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **Add New → Project**
3. Import `montclair-tennis-ladder` from GitHub
4. Framework preset: **Vite**
5. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click **Deploy**

Your app is now live at `https://montclair-tennis-ladder.vercel.app`

### Step 2 — Add custom domain (optional)

In Vercel → **Domains**, add your domain (e.g. `montclair.tennis`)

---

## Setting Up Twilio SMS

1. Create a [Twilio account](https://twilio.com)
2. Get a phone number (US, SMS-capable)
3. Note your **Account SID**, **Auth Token**, and **Phone Number**

### Deploy Edge Functions

Install Supabase CLI:
```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
```

Set secrets:
```bash
supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxxxxx
supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token
supabase secrets set TWILIO_PHONE_NUMBER=+19735550100
supabase secrets set APP_URL=https://montclair.tennis
```

Deploy functions:
```bash
supabase functions deploy send-sms
supabase functions deploy auto-confirm
supabase functions deploy challenge-deadline
supabase functions deploy inactivity-check
supabase functions deploy send-invite
```

### Set up cron jobs

In Supabase → **Database → Extensions**, enable `pg_cron`.

Then in SQL Editor:
```sql
-- Auto-confirm scores every 30 minutes
SELECT cron.schedule('auto-confirm', '*/30 * * * *',
  $$SELECT net.http_post(url := 'https://your-project.supabase.co/functions/v1/auto-confirm',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb) AS request_id$$
);

-- Challenge deadline check every hour
SELECT cron.schedule('challenge-deadline', '0 * * * *',
  $$SELECT net.http_post(url := 'https://your-project.supabase.co/functions/v1/challenge-deadline',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb) AS request_id$$
);

-- Inactivity check daily at midnight
SELECT cron.schedule('inactivity-check', '0 0 * * *',
  $$SELECT net.http_post(url := 'https://your-project.supabase.co/functions/v1/inactivity-check',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb) AS request_id$$
);
```

---

## Making Benzi an Admin

After Benzi signs up for the first time, run this in Supabase SQL Editor:

```sql
UPDATE users SET is_admin = true WHERE email = 'benzi@example.com';
```

Replace `benzi@example.com` with Benzi's actual email address.

---

## PWA Icons

You need two icon files in `/public`:
- `logo-192.png` — 192×192 pixels
- `logo-512.png` — 512×512 pixels
- `apple-touch-icon.png` — 180×180 pixels

Export the Montclair Tennis Ladder logo at these sizes and place them in the `public/` folder.

---

## Project Structure

```
src/
  components/
    screens/       # Full-screen views
    modals/        # Bottom sheets and overlays
    ui/            # Reusable UI components
  hooks/           # useAuth, useLadder, useChallenges
  lib/             # supabase client, challenge logic
  styles/          # global.css with design tokens
  types/           # TypeScript interfaces
supabase/
  migrations/      # Database schema SQL
  functions/       # Edge Functions (Deno)
public/            # Static assets + PWA icons
```

---

## Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--ink` | `#201c1d` | Primary text, buttons, nav |
| `--green` | `#c4e012` | Accent, CTAs, eligible rows |
| `--orange` | `#e0914f` | Warnings, penalties |
| `--off` | `#f6f5f3` | Page background |
| `--rule` | `#e6e4e0` | Dividers, borders |

Fonts: **Barlow Condensed** (display) + **Barlow** (body) — both from Google Fonts.
