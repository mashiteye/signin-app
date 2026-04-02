# SignIn - Event Attendance with Digital Signatures

Standalone web app for capturing event attendance and digital signatures. Built for NGOs and event organizers.

## Stack

- **Frontend:** React + Vite
- **Backend:** Supabase (auth, database, storage)
- **Hosting:** Vercel (free tier)

## Setup

### 1. Supabase

Project: `wryevlgmsrzlzzypnkaf` (eu-west-1).

Run `supabase/schema-update.sql` in the SQL Editor to add the `event_code` column and public RLS policies needed for the tablet attendance page.

Then configure:
- **Authentication > Email Auth:** Enable email/password sign-ups
- **Authentication > URL Configuration:** Add your Vercel domain to Redirect URLs
- **Storage > signatures bucket:** Make public (add SELECT and INSERT policies for anon)

### 2. Environment variables

Copy `.env.example` to `.env`:

```
VITE_SUPABASE_URL=https://wryevlgmsrzlzzypnkaf.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Find anon key at: Supabase Dashboard > Settings > API > anon/public key.

### 3. Local dev

```bash
npm install
npm run dev
```

### 4. Deploy to Vercel

Connect your GitHub repo at vercel.com > New Project > Import `signin-app`. Add environment variables in Settings > Environment Variables.

## Routes

| Route | Auth | Purpose |
|---|---|---|
| `/login` | Public | Sign in |
| `/signup` | Public | Create account + org |
| `/` | Protected | Dashboard (event list) |
| `/events/new` | Protected | Create event |
| `/events/:id` | Protected | Event detail + participants |
| `/attend/:code` | Public | Tablet attendance page |

## CSV format

```
Name,Organization,Email,Position,Sex,Program
```

Only `Name` is required.

## Version

v2.0.0
