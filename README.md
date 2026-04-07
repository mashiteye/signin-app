# SignIn - Event Attendance with Digital Signatures

Standalone web app for capturing event attendance and digital signatures. Built for NGOs and event organizers.

## Stack

- **Frontend:** React 18 + Vite 5
- **Backend:** Supabase (auth, database, storage)
- **Hosting:** Vercel (free tier)

## Setup (4 steps)

### 1. Supabase — Run the schema

Go to Supabase Dashboard > SQL Editor > New query. Paste the entire contents of `supabase/complete-schema.sql` and click Run. This creates all tables, RLS policies, and the signatures storage bucket in one shot.

Then configure auth:
- Authentication > Providers > Email: ensure it's enabled
- Authentication > URL Configuration > Redirect URLs: add your Vercel domain

### 2. Environment variables

Copy `.env.example` to `.env` and fill in your anon key:

```
VITE_SUPABASE_URL=https://wryevlgmsrzlzzypnkaf.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Find the anon key at: Supabase Dashboard > Settings > API > anon/public key.

### 3. Deploy to Vercel

Connect your GitHub repo at vercel.com. Add the two environment variables above in Project Settings > Environment Variables.

The `vercel.json` file handles SPA routing so deep links like `/attend/xxx` work correctly.

### 4. Test

1. Sign up with email + password
2. Create an event
3. Add participants (manual or CSV)
4. Open the attendance link on a tablet in incognito

### CSV format

```
Name,Organization,Email,Position,Sex,Program
John Doe,ACME Corp,john@acme.org,Manager,Male,Project Alpha
```

Only the `Name` column is required.

## Troubleshooting

**"Event not found" on attend page:** Usually means Supabase free tier has paused the project. Open the Supabase dashboard to wake it up, then refresh.

**Slow first load:** Free tier cold start takes 5-10 seconds. Pre-load tablets before events.

## Version

v2.2.0
