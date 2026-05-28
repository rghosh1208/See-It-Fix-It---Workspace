# SEE IT FIX IT — Vercel Dashboard

A Next.js dashboard that pulls Qualtrics "SEE IT FIX IT" responses into
Supabase on a 15-minute Vercel cron, keeping only rows where the
free-text **Location** field (Q23) is not null.

```
┌──────────────┐   cron (every 15m)    ┌──────────────┐   reads     ┌──────────────┐
│  Qualtrics   │ ────────────────────▶ │  /api/sync-  │ ──────────▶ │   Supabase   │
│ Survey SV_…  │   export-responses    │  qualtrics   │   upsert    │ sifi_workspace│
└──────────────┘                       └──────────────┘             └──────┬───────┘
                                                                            │ select
                                                                            ▼
                                                                     ┌──────────────┐
                                                                     │ Next.js page │
                                                                     │ map+chart+tbl│
                                                                     └──────────────┘
```

## What it shows

- **Map** of every response with GPS coordinates, color-coded by sentiment
- **Issue type breakdown** bar chart (Toilet, Trash, Lights, Cleanliness, …)
- **Filterable response table** with sortable columns, site/issue-type/search filters

---

## 1. Prerequisites

- Node 18.17+
- A Supabase project (you said you already have one — we'll just add tables)
- A Vercel account
- A Qualtrics account with API access to your SIFI survey

## 2. Get your Qualtrics credentials

You need three things. All can be found inside Qualtrics — no support ticket needed.

| Thing                   | Where to find it                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `QUALTRICS_API_TOKEN`   | Account icon (top right) → **Account Settings** → **Qualtrics IDs**. Under "API" click **Generate Token**. Copy the token immediately.            |
| `QUALTRICS_SURVEY_ID`   | Same **Qualtrics IDs** page, "Surveys" section — it's the column labeled *Survey ID*. Looks like `SV_abc123…`.                                    |
| `QUALTRICS_DATACENTER`  | Same page, top of the screen, "User" section — the *Datacenter ID*. Common values: `iad1`, `syd1`, `fra1`, `sjc1`. **Not** the full domain.       |

Your account must have **API access** enabled in the brand admin. If the
"Generate Token" button is missing, ask a brand admin to enable it for your role.

## 3. Set up Supabase

In the Supabase dashboard → SQL editor → paste & run **`supabase/schema.sql`** from this repo.

That creates two tables:

- `sifi_workspace` — one row per Qualtrics response. `location` is `NOT NULL` so bad rows can't get in.
- `sifi_workspace_sync_state` — a one-row bookkeeping table so the cron job can resume incrementally.

Both have RLS enabled with a public-read policy. The sync job writes with
the **service role key**, which bypasses RLS.

Get your Supabase keys from **Settings → API**:

- `NEXT_PUBLIC_SUPABASE_URL` — the Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the **anon** public key
- `SUPABASE_SERVICE_ROLE_KEY` — the **service_role** secret (keep it server-only!)

## 4. Local development

```bash
cd sifi-dashboard
cp .env.local.example .env.local        # fill in the values
npm install
npm run dev
```

Open <http://localhost:3000>.

### Load sample data without hitting Qualtrics

The provided sample CSV is in `sample-data/sample.csv`. To load it into
Supabase so you can see the dashboard immediately:

```bash
npm run seed
```

That uses the same env vars as the app and upserts every row whose
**Location** field is non-empty. Re-runnable safely.

### Trigger a real Qualtrics sync locally

```bash
curl http://localhost:3000/api/sync-qualtrics
```

Response is JSON: `{ ok, inserted, skippedNoLocation, since }`. You can
check `sifi_workspace_sync_state` in Supabase to see the watermark.

## 5. Deploy to Vercel

1. Push this folder to a new GitHub repo.
2. In Vercel: **Add New → Project → Import** the repo.
3. In **Settings → Environment Variables**, add the six values from `.env.local`
   (Supabase + Qualtrics). Vercel will auto-generate `CRON_SECRET` when you
   add the cron — leave that variable empty in your local env, and copy
   whatever Vercel generates into the Production env if you want to test
   the cron auth locally.
4. Click **Deploy**. The first deploy installs the cron from `vercel.json`.
5. Open the **Cron Jobs** tab in your project and click **Run** once to do
   the initial sync.

The cron runs every 15 minutes (`*/15 * * * *`). To change the cadence,
edit `vercel.json` and redeploy.

## 6. How "location ≠ null" is enforced

Three layers, in order of strictness:

1. **DB constraint** — `sifi_workspace.location` is `NOT NULL` and has a
   `length(btrim(location)) > 0` check. Empty strings are rejected.
2. **Sync filter** — `mapQualtricsToRow()` in `src/lib/mapResponse.ts`
   returns `null` for any response whose Q23 (Location) is empty,
   skipping it before the upsert.
3. **Query filter** — `/api/responses` adds `.not('location', 'is', null)`
   on every read, so even if a row sneaked in another way, the dashboard
   would never show it.

## 7. File map

```
sifi-dashboard/
├── README.md
├── package.json
├── vercel.json                         ← cron schedule
├── .env.local.example
├── supabase/
│   └── schema.sql                      ← run in Supabase SQL editor
├── sample-data/
│   └── sample.csv                      ← your SIFI export, for seeding
├── scripts/
│   └── seed.ts                         ← npm run seed
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── globals.css
    │   └── api/
    │       ├── sync-qualtrics/route.ts ← cron target
    │       └── responses/route.ts      ← dashboard read API
    ├── components/
    │   ├── Dashboard.tsx               ← page shell, filters
    │   ├── IssueMap.tsx                ← react-leaflet map
    │   ├── IssueBreakdown.tsx          ← recharts bar chart
    │   ├── ResponsesTable.tsx          ← sortable table
    │   └── StatsBar.tsx
    └── lib/
        ├── qualtrics.ts                ← export-responses API client
        ├── mapResponse.ts              ← Qualtrics JSON → DB row
        ├── supabase.ts                 ← public & service-role clients
        └── types.ts
```

## 8. Troubleshooting

| Symptom                                                                   | Likely cause                                                                                                                          |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `Missing required env var QUALTRICS_API_TOKEN`                            | Env var not set in Vercel **or** in `.env.local`.                                                                                     |
| `Qualtrics 401`                                                           | Token is wrong, expired, or your account doesn't have API access enabled.                                                              |
| `Qualtrics 404` on the export endpoint                                    | `QUALTRICS_DATACENTER` is wrong. Don't use the full `*.qualtrics.com` host — use just the subdomain like `iad1`.                       |
| Map shows "No responses have GPS coordinates yet"                         | Your Qualtrics survey isn't capturing geo. Enable *Location-Based Question* or the *Anonymous tracking → Location data* survey option. |
| Dashboard is empty but cron logs say "inserted: N"                        | RLS is blocking the anon read. Re-run `supabase/schema.sql` — the policy at the bottom is what allows the dashboard to read.           |
| `npm run seed` errors with "duplicate key value violates"                 | Safe to ignore — `upsert` replaces the existing row.                                                                                  |
