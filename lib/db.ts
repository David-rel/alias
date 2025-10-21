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

type QueryParam = string | number | boolean | Date | null;

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: QueryParam[] = [],
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
  password_hash: string;
  email_verified: boolean;
  email_code: string | null;
  onboarding_completed: boolean;
  password_reset_code: string | null;
  password_reset_expires: Date | null;
  created_at: Date;
  updated_at: Date;
};
