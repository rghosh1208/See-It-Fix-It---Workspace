-- =============================================================
-- SEE IT FIX IT (Qualtrics) — Supabase schema
-- Run this in your Supabase SQL editor.
-- =============================================================

-- Main responses table (named sifi_workspace because sifi_responses is
-- already in use elsewhere in this Supabase project).
-- One row per Qualtrics ResponseId. Only rows with a non-null "location"
-- (Q23) are kept — the sync job filters before upserting, and the
-- NOT NULL + check constraint guard against bad rows being inserted manually.
create table if not exists public.sifi_workspace (
  response_id              text primary key,

  -- Qualtrics metadata
  start_date               timestamptz,
  end_date                 timestamptz,
  recorded_date            timestamptz,
  status                   text,
  progress                 int,
  duration_seconds         int,
  finished                 boolean,
  ip_address               text,
  distribution_channel     text,
  user_language            text,

  -- Geo (auto-captured by Qualtrics)
  location_latitude        double precision,
  location_longitude       double precision,

  -- Recipient
  recipient_first_name     text,
  recipient_last_name      text,
  recipient_email          text,
  external_reference       text,

  -- Structured location (Q13/Q14)
  site                     text,   -- Q13_1 LOCATION - Site
  building                 text,   -- Q13_2 LOCATION - Building
  room_number              text,   -- Q14_1 SPECIFIC ROOM/AREA - Room #
  floor                    text,   -- Q14_2 SPECIFIC ROOM/AREA - Floor

  -- The "location" filter field — Q23 free-text Location
  location                 text not null,

  -- Free-text fields
  description              text,   -- Q31 DESCRIPTION
  issue_description        text,   -- Q24 Description Of Issue

  -- Contact
  contact_email            text,   -- Q9_3
  contact_phone            text,   -- Q9_2
  contact_department       text,   -- Q9_5

  -- Issue type flags (each is a single-choice text from a category)
  issue_toilet             text,   -- Q15
  issue_trash              text,   -- Q16
  issue_restroom_supplies  text,   -- Q17
  issue_sink               text,   -- Q18 (Issue Type Sink)
  issue_lights             text,   -- Q19
  issue_cleanliness        text,   -- Q20
  issue_broken_dispenser   text,   -- Q21
  issue_pest               text,   -- Q22 (Issue Type Pest)
  issue_ceiling_tile       text,   -- Q23 (Issue Type Ceiling Tile)
  issue_door               text,   -- Q24 (Issue Type Door)

  source                   text,
  location_id              text,

  -- Qualtrics text-iQ enrichment (Q41 columns)
  topics                   text,
  actionability            text,
  effort                   text,
  effort_numeric           double precision,
  emotion_intensity        text,
  emotion                  text,
  parent_topics            text,
  sentiment_polarity       text,
  sentiment_score          double precision,
  sentiment                text,
  topic_sentiment_label    text,
  topic_sentiment_score    double precision,
  topic_hierarchy_level_1  text,

  -- Original payload for forward-compatibility / debugging
  raw                      jsonb,
  synced_at                timestamptz not null default now(),

  constraint sifi_workspace_location_not_blank
    check (length(btrim(location)) > 0)
);

-- Indexes for the dashboard's common access patterns
create index if not exists sifi_workspace_recorded_at_idx
  on public.sifi_workspace (recorded_date desc);

create index if not exists sifi_workspace_site_idx
  on public.sifi_workspace (site);

create index if not exists sifi_workspace_location_idx
  on public.sifi_workspace (location);

create index if not exists sifi_workspace_sentiment_idx
  on public.sifi_workspace (sentiment);

-- Small bookkeeping table so the sync job can resume incrementally.
create table if not exists public.sifi_workspace_sync_state (
  id                        int primary key default 1,
  last_synced_at            timestamptz,
  last_response_id          text,
  last_run_at               timestamptz not null default now(),
  last_run_inserted         int default 0,
  last_run_skipped_no_loc   int default 0,
  last_run_error            text,
  constraint sifi_workspace_sync_state_singleton check (id = 1)
);

insert into public.sifi_workspace_sync_state (id) values (1)
on conflict (id) do nothing;

-- =============================================================
-- Row-level security
-- =============================================================
-- The dashboard reads with the anon key; the sync job writes with
-- the service role key (which bypasses RLS). So we enable RLS and
-- only grant a read policy to anon/authenticated.
alter table public.sifi_workspace            enable row level security;
alter table public.sifi_workspace_sync_state enable row level security;

drop policy if exists "Public read sifi_workspace" on public.sifi_workspace;
create policy "Public read sifi_workspace"
  on public.sifi_workspace for select
  to anon, authenticated
  using (true);

drop policy if exists "Public read sifi_workspace_sync_state" on public.sifi_workspace_sync_state;
create policy "Public read sifi_workspace_sync_state"
  on public.sifi_workspace_sync_state for select
  to anon, authenticated
  using (true);
