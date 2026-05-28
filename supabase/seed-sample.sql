-- Manual seed for the slim sifi_workspace from the 14-column SIFI CSV.
-- Run this in Supabase SQL editor after slim-schema.sql.
-- Safe to re-run — on conflict it updates existing rows.

insert into public.sifi_workspace (
  response_id,
  start_date,
  end_date,
  recorded_date,
  recipient_first_name,
  recipient_last_name,
  recipient_email,
  contact_email,
  contact_phone,
  contact_department,
  location,
  issue_category,
  issue_description,
  location_id
) values
(
  'R_5CnNgElYAVVmAWR',
  '2026-02-27T11:25:00',
  '2026-02-27T11:28:00',
  '2026-02-27T11:28:00',
  NULL, NULL, NULL,
  'Shelly.liu@ucsf.edu',
  '4153539526',
  NULL,
  '654 Minnesota Street 3043-02-234',
  'Furniture',
  'Standing desk is not working',
  '654 Minnesota Street 3043-02-234'
),
(
  'R_6LokZQBYiGARFg5',
  '2026-04-02T12:23:00',
  '2026-04-02T12:24:00',
  '2026-04-02T12:24:00',
  NULL, NULL, NULL,
  'Terri.Hollister@ucsf.edu',
  NULL, NULL,
  'Wayne & Gladys Valley Center for Vision 3080-03-3106',
  NULL,
  'The docking station and monitor are not working at workspace VCV-3106',
  'Wayne & Gladys Valley Center for Vision 3080-03-3106'
),
(
  'R_6SdUh6g4aA9No3d',
  '2026-04-16T09:25:00',
  '2026-04-16T09:27:00',
  '2026-04-16T09:27:00',
  NULL, NULL, NULL,
  'Marisa.howlette@gmail.com',
  '628-264-8500',
  'Human Resources',
  'Wayne & Gladys Valley Center for Vision 3080-03-3111',
  'Furniture',
  'The desk only moves down. There seems to be an error when trying to raise the desk to the appropriate height.',
  'Wayne & Gladys Valley Center for Vision 3080-03-3111'
),
(
  'R_7A5vqTlZZpAIBix',
  '2026-04-16T11:06:00',
  '2026-04-16T11:09:00',
  '2026-04-16T11:09:00',
  NULL, NULL, NULL,
  'Catera.Wilder@ucsf.edu',
  '816-352-5102',
  NULL,
  'Wayne & Gladys Valley Center for Vision 3080-03-3109',
  'Furniture',
  'The monitor will not stay upright but tilts down making it hard to see what''s on the screen. I attempted to adjust it but nothing seems to work.',
  'Wayne & Gladys Valley Center for Vision 3080-03-3109'
),
(
  'R_3illdklqs0WCEPN',
  '2026-04-24T09:19:00',
  '2026-04-24T09:19:00',
  '2026-04-24T09:19:00',
  NULL, NULL, NULL,
  NULL, NULL, NULL,
  'Wayne & Gladys Valley Center for Vision 3080-03-3111',
  NULL,
  NULL,
  'Wayne & Gladys Valley Center for Vision 3080-03-3111'
)
on conflict (response_id) do update set
  start_date            = excluded.start_date,
  end_date              = excluded.end_date,
  recorded_date         = excluded.recorded_date,
  recipient_first_name  = excluded.recipient_first_name,
  recipient_last_name   = excluded.recipient_last_name,
  recipient_email       = excluded.recipient_email,
  contact_email         = excluded.contact_email,
  contact_phone         = excluded.contact_phone,
  contact_department    = excluded.contact_department,
  location              = excluded.location,
  issue_category        = excluded.issue_category,
  issue_description     = excluded.issue_description,
  location_id           = excluded.location_id;
