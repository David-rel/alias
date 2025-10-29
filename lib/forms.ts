import { randomBytes } from "node:crypto";
import { query, type DbFormQuestionRow, type DbFormRow } from "./db";
import type {
  FormQuestionClientShape,
  FormQuestionSettings,
  FormQuestionType,
  FormStatus,
} from "@/types/forms";

const SHARE_ID_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
const SHARE_ID_LENGTH = 10;
const QUESTION_KEY_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export const ALLOWED_FORM_QUESTION_TYPES: ReadonlyArray<FormQuestionType> = [
  "short_text",
  "long_text",
  "email",
  "number",
  "decimal",
  "boolean",
  "date",
  "time",
  "choice_single",
  "choice_multi",
  "file",
  "rating",
];

function generateShareIdCandidate(): string {
  const bytes = randomBytes(SHARE_ID_LENGTH);
  let result = "";

  for (const byte of bytes) {
    const index = byte % SHARE_ID_ALPHABET.length;
    result += SHARE_ID_ALPHABET[index] ?? "a";
  }

  return result;
}

export async function generateUniqueFormShareId(): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = generateShareIdCandidate();
    const existing = await query<{ id: string }>(
      `SELECT id
         FROM forms
        WHERE share_id = $1
        LIMIT 1`,
      [candidate],
    );

    if (existing.rowCount === 0) {
      return candidate;
    }
  }

  throw new Error("Unable to generate a unique share ID for form");
}

export function mapQuestionRowToClient(
  row: DbFormQuestionRow,
): FormQuestionClientShape {
  const settings =
    (row.settings && typeof row.settings === "object"
      ? row.settings
      : {}) as FormQuestionSettings;

  return {
    id: row.id,
    fieldKey: row.field_key,
    type: row.question_type,
    label: row.label,
    description: row.description,
    required: row.required,
    position: row.position,
    settings,
  };
}

export function assertValidQuestionType(
  type: string,
): asserts type is FormQuestionType {
  if ((ALLOWED_FORM_QUESTION_TYPES as readonly string[]).includes(type)) {
    return;
  }

  throw new Error(`Unsupported question type: ${type}`);
}

export function assertValidFormStatus(status: string): asserts status is FormStatus {
  if (status === "draft" || status === "active" || status === "archived") {
    return;
  }

  throw new Error(`Invalid form status: ${status}`);
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function resolveFieldKey(label: string, fallback?: string): string {
  const base = slugify(label);

  if (base) {
    return base;
  }

  if (fallback) {
    return fallback;
  }

  const bytes = randomBytes(6);
  let result = "field-";

  for (const byte of bytes) {
    const idx = byte % QUESTION_KEY_ALPHABET.length;
    result += QUESTION_KEY_ALPHABET[idx] ?? "a";
  }

  return result;
}

export async function getFormForBusiness(
  formId: string,
  businessId: string,
): Promise<DbFormRow | null> {
  const result = await query<DbFormRow>(
    `SELECT *
       FROM forms
      WHERE id = $1 AND business_id = $2
      LIMIT 1`,
    [formId, businessId],
  );

  return result.rows[0] ?? null;
}
