-- =============================================================
-- Slim down sifi_workspace to only the fields actually used.
-- Run this in your Supabase SQL editor — it's idempotent.
-- =============================================================

-- 1) Drop everything we no longer need
alter table public.sifi_workspace
  drop column if exists status,
  drop column if exists progress,
  drop column if exists duration_seconds,
  drop column if exists finished,
  drop column if exists ip_address,
  drop column if exists distribution_channel,
  drop column if exists user_language,
  drop column if exists location_latitude,
  drop column if exists location_longitude,
  drop column if exists external_reference,
  drop column if exists site,
  drop column if exists building,
  drop column if exists room_number,
  drop column if exists floor,
  drop column if exists description,
  drop column if exists issue_toilet,
  drop column if exists issue_trash,
  drop column if exists issue_restroom_supplies,
  drop column if exists issue_sink,
  drop column if exists issue_lights,
  drop column if exists issue_cleanliness,
  drop column if exists issue_broken_dispenser,
  drop column if exists issue_pest,
  drop column if exists issue_ceiling_tile,
  drop column if exists issue_door,
  drop column if exists source,
  drop column if exists topics,
  drop column if exists actionability,
  drop column if exists effort,
  drop column if exists effort_numeric,
  drop column if exists emotion_intensity,
  drop column if exists emotion,
  drop column if exists parent_topics,
  drop column if exists sentiment_polarity,
  drop column if exists sentiment_score,
  drop column if exists sentiment,
  drop column if exists topic_sentiment_label,
  drop column if exists topic_sentiment_score,
  drop column if exists topic_hierarchy_level_1,
  drop column if exists raw;

-- 2) Add the issue_category column (Q22 "Select Issue Below")
alter table public.sifi_workspace
  add column if not exists issue_category text;

-- Final shape of sifi_workspace:
--   response_id, start_date, end_date, recorded_date,
--   recipient_first_name, recipient_last_name, recipient_email,
--   contact_email, contact_phone, contact_department,
--   location, issue_category, issue_description, location_id,
--   synced_at
