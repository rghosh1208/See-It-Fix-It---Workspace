import type { SifiResponse } from "./types";

/**
 * Static dashboard data — mirrors what's currently in sifi_workspace.
 *
 * Timestamps use Pacific Time offsets (the survey's timezone):
 *   -08:00 = PST (Nov–Mar)
 *   -07:00 = PDT (Mar–Nov)
 *
 * To update: edit this file, commit, push. The dashboard rebuilds and
 * shows the new data within a minute. No Supabase round-trip needed.
 */
export const STATIC_ROWS: SifiResponse[] = [
  {
    response_id: "R_3illdklqs0WCEPN",
    start_date: "2026-04-24T09:19:00-07:00",
    end_date: "2026-04-24T09:19:00-07:00",
    recorded_date: "2026-04-24T09:19:00-07:00",
    recipient_first_name: null,
    recipient_last_name: null,
    recipient_email: null,
    contact_email: null,
    contact_phone: null,
    contact_department: null,
    location: "Wayne & Gladys Valley Center for Vision 3080-03-3111",
    issue_category: "Technology",
    issue_description: null,
    location_id: "Wayne & Gladys Valley Center for Vision 3080-03-3111",
  },
  {
    response_id: "R_5CnNgElYAVVmAWR",
    start_date: "2026-02-27T11:25:00-08:00",
    end_date: "2026-02-27T11:28:00-08:00",
    recorded_date: "2026-02-27T11:28:00-08:00",
    recipient_first_name: null,
    recipient_last_name: null,
    recipient_email: null,
    contact_email: "Shelly.liu@ucsf.edu",
    contact_phone: "4153539526",
    contact_department: null,
    location: "654 Minnesota Street 3043-02-234",
    issue_category: "Furniture",
    issue_description: "Standing desk is not working",
    location_id: "654 Minnesota Street 3043-02-234",
  },
  {
    response_id: "R_6LokZQBYiGARFg5",
    start_date: "2026-04-02T12:23:00-07:00",
    end_date: "2026-04-02T12:24:00-07:00",
    recorded_date: "2026-04-02T12:24:00-07:00",
    recipient_first_name: null,
    recipient_last_name: null,
    recipient_email: null,
    contact_email: "Terri.Hollister@ucsf.edu",
    contact_phone: null,
    contact_department: null,
    location: "Wayne & Gladys Valley Center for Vision 3080-03-3106",
    issue_category: "Technology",
    issue_description:
      "The docking station and monitor are not working at workspace VCV-3106",
    location_id: "Wayne & Gladys Valley Center for Vision 3080-03-3106",
  },
  {
    response_id: "R_6SdUh6g4aA9No3d",
    start_date: "2026-04-16T09:25:00-07:00",
    end_date: "2026-04-16T09:27:00-07:00",
    recorded_date: "2026-04-16T09:27:00-07:00",
    recipient_first_name: null,
    recipient_last_name: null,
    recipient_email: null,
    contact_email: "Marisa.howlette@gmail.com",
    contact_phone: "628-264-8500",
    contact_department: "Human Resources",
    location: "Wayne & Gladys Valley Center for Vision 3080-03-3111",
    issue_category: "Furniture",
    issue_description:
      "The desk only moves down. There seems to be an error when trying to raise the desk to the appropriate height.",
    location_id: "Wayne & Gladys Valley Center for Vision 3080-03-3111",
  },
  {
    response_id: "R_7A5vqTlZZpAIBix",
    start_date: "2026-04-16T11:06:00-07:00",
    end_date: "2026-04-16T11:09:00-07:00",
    recorded_date: "2026-04-16T11:09:00-07:00",
    recipient_first_name: null,
    recipient_last_name: null,
    recipient_email: null,
    contact_email: "Catera.Wilder@ucsf.edu",
    contact_phone: "816-352-5102",
    contact_department: null,
    location: "Wayne & Gladys Valley Center for Vision 3080-03-3109",
    issue_category: "Furniture",
    issue_description:
      "The monitor will not stay upright but tilts down making it hard to see what's on the screen. I attempted to adjust it but nothing seems to work.",
    location_id: "Wayne & Gladys Valley Center for Vision 3080-03-3109",
  },
];
