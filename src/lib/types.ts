export type SifiResponse = {
  response_id: string;
  start_date: string | null;
  end_date: string | null;
  recorded_date: string | null;
  status: string | null;
  progress: number | null;
  duration_seconds: number | null;
  finished: boolean | null;
  ip_address: string | null;
  distribution_channel: string | null;
  user_language: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  recipient_first_name: string | null;
  recipient_last_name: string | null;
  recipient_email: string | null;
  external_reference: string | null;
  site: string | null;
  building: string | null;
  room_number: string | null;
  floor: string | null;
  location: string;
  description: string | null;
  issue_description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_department: string | null;
  issue_toilet: string | null;
  issue_trash: string | null;
  issue_restroom_supplies: string | null;
  issue_sink: string | null;
  issue_lights: string | null;
  issue_cleanliness: string | null;
  issue_broken_dispenser: string | null;
  issue_pest: string | null;
  issue_ceiling_tile: string | null;
  issue_door: string | null;
  source: string | null;
  location_id: string | null;
  topics: string | null;
  actionability: string | null;
  effort: string | null;
  effort_numeric: number | null;
  emotion_intensity: string | null;
  emotion: string | null;
  parent_topics: string | null;
  sentiment_polarity: string | null;
  sentiment_score: number | null;
  sentiment: string | null;
  topic_sentiment_label: string | null;
  topic_sentiment_score: number | null;
  topic_hierarchy_level_1: string | null;
};

/** Canonical list of issue type columns, for the breakdown chart. */
export const ISSUE_TYPE_COLUMNS: { key: keyof SifiResponse; label: string }[] = [
  { key: "issue_toilet", label: "Toilet" },
  { key: "issue_trash", label: "Trash" },
  { key: "issue_restroom_supplies", label: "Restroom Supplies" },
  { key: "issue_sink", label: "Sink" },
  { key: "issue_lights", label: "Lights" },
  { key: "issue_cleanliness", label: "Cleanliness" },
  { key: "issue_broken_dispenser", label: "Broken Dispenser" },
  { key: "issue_pest", label: "Pest" },
  { key: "issue_ceiling_tile", label: "Ceiling Tile" },
  { key: "issue_door", label: "Door" },
];
