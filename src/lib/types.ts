export type SifiResponse = {
  response_id: string;
  start_date: string | null;
  end_date: string | null;
  recorded_date: string | null;
  recipient_first_name: string | null;
  recipient_last_name: string | null;
  recipient_email: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_department: string | null;
  location: string;
  issue_category: string | null;
  issue_description: string | null;
  location_id: string | null;
};
