import { Pool, type QueryResult, type QueryResultRow } from "pg";
import type {
  FormQuestionType,
  FormResponseStatus,
  FormStatus,
} from "@/types/forms";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

export const pool = new Pool({
  connectionString,
  max: 10,
  ssl: connectionString.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

type PrimitiveParam = string | number | boolean | Date | null;
type ArrayParam = string[] | number[] | boolean[] | Date[];

export type QueryParam = PrimitiveParam | ArrayParam;

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: QueryParam[] = []
): Promise<QueryResult<T>> {
  const client = await pool.connect();

  try {
    const result = await client.query<T>(text, params);
    return result;
  } finally {
    client.release();
  }
}

export type DbUserRow = {
  id: string;
  email: string;
  name: string | null;
  company_name: string | null;
  phone_number: string | null;
  profile_image_url: string | null;
  timezone: string | null;
  location: string | null;
  password_hash: string;
  email_verified: boolean;
  email_code: string | null;
  onboarding_completed: boolean;
  password_reset_code: string | null;
  password_reset_expires: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type DbBusinessRow = {
  id: string;
  owner_user_id: string;
  name: string | null;
  business_category: string | null;
  industry: string | null;
  description: string | null;
  logo_path: string | null;
  company_size: string | null;
  location: string | null;
  feature_preferences: string[];
  created_at: Date;
  updated_at: Date;
};

export type DbBusinessTeamMemberRow = {
  id: string;
  business_id: string;
  user_id: string | null;
  email: string;
  role: "owner" | "admin" | "guest";
  invite_status: "pending" | "accepted" | "declined";
  invited_at: Date;
  joined_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type DbBusinessPaymentPlanRow = {
  id: string;
  business_id: string;
  plan_id: string;
  plan_name: string;
  status: string;
  payment_provider: string | null;
  current_period_end: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type DbBusinessIntegrationRow = {
  id: string;
  business_id: string;
  integration_key: string;
  status: string;
  settings: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
};

export type DbUserPreferencesRow = {
  id: string;
  user_id: string;
  preferences: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
};

export type DbFormRow = {
  id: string;
  business_id: string;
  created_by_user_id: string | null;
  title: string;
  description: string | null;
  share_id: string;
  status: FormStatus;
  accepting_responses: boolean;
  submission_message: string | null;
  cover_image_url: string | null;
  created_at: Date;
  updated_at: Date;
};

export type DbFormQuestionRow = {
  id: string;
  form_id: string;
  field_key: string;
  question_type: FormQuestionType;
  label: string;
  description: string | null;
  required: boolean;
  position: number;
  settings: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
};

export type DbFormResponseRow = {
  id: string;
  form_id: string;
  submitted_by_user_id: string | null;
  submitted_ip: string | null;
  submitted_user_agent: string | null;
  submitted_at: Date;
  status: FormResponseStatus;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
};

export type DbFormAnswerRow = {
  id: string;
  response_id: string;
  question_id: string;
  value_text: string | null;
  value_number: string | null;
  value_boolean: boolean | null;
  value_date: Date | null;
  value_json: unknown | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  file_content_type: string | null;
  created_at: Date;
  updated_at: Date;
};

export type DbAppointmentCalendarRow = {
  id: string;
  business_id: string;
  owner_user_id: string;
  name: string;
  appointment_type: string;
  description: string | null;
  location_type: "in_person" | "virtual" | "phone" | "custom";
  location_details: string | null;
  virtual_meeting_preference: string | null;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  timezone: string;
  share_id: string;
  booking_window_days: number;
  min_schedule_notice_minutes: number;
  status: "active" | "inactive";
  requires_confirmation: boolean;
  google_calendar_sync: boolean;
  created_at: Date;
  updated_at: Date;
};

export type DbAppointmentAvailabilityRuleRow = {
  id: string;
  calendar_id: string;
  rule_type: "weekly" | "date";
  day_of_week: number | null;
  specific_date: Date | null;
  start_minutes: number;
  end_minutes: number;
  is_unavailable: boolean;
  created_at: Date;
  updated_at: Date;
};

export type DbAppointmentBookingRow = {
  id: string;
  calendar_id: string;
  created_by_user_id: string | null;
  share_id: string;
  guest_name: string;
  guest_email: string;
  guest_timezone: string | null;
  guest_notes: string | null;
  start_time: Date;
  end_time: Date;
  status: "scheduled" | "cancelled" | "completed";
  meeting_url: string | null;
  meeting_location: string | null;
  external_event_id: string | null;
  external_calendar: string | null;
  created_at: Date;
  updated_at: Date;
};
