import { Pool, type QueryResult, type QueryResultRow } from "pg";

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
