import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrimaryBusinessForUser } from "@/lib/business";
import { query, type DbFormQuestionRow } from "@/lib/db";
import {
  assertValidQuestionType,
  getFormForBusiness,
  mapQuestionRowToClient,
  resolveFieldKey,
} from "@/lib/forms";
import type { FormQuestionType } from "@/types/forms";

type RouteContext = {
  params: Promise<{
    formId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const businessContext = await getPrimaryBusinessForUser(session.user.id);

  if (!businessContext) {
    return NextResponse.json(
      { error: "No business found for user" },
      { status: 403 },
    );
  }

  const { formId } = await context.params;

  const form = await getFormForBusiness(formId, businessContext.business.id);

  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  const questions = await query<DbFormQuestionRow>(
    `SELECT *
       FROM form_questions
      WHERE form_id = $1
      ORDER BY position ASC, created_at ASC`,
    [form.id],
  );

  return NextResponse.json({
    questions: questions.rows.map(mapQuestionRowToClient),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const businessContext = await getPrimaryBusinessForUser(session.user.id);

  if (!businessContext) {
    return NextResponse.json(
      { error: "No business found for user" },
      { status: 403 },
    );
  }

  if (businessContext.role === "guest") {
    return NextResponse.json(
      { error: "Insufficient permissions to modify questions" },
      { status: 403 },
    );
  }

  const { formId } = await context.params;

  const form = await getFormForBusiness(formId, businessContext.business.id);

  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  let payload: {
    fieldKey?: unknown;
    label?: unknown;
    description?: unknown;
    required?: unknown;
    position?: unknown;
    type?: unknown;
    settings?: unknown;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const label =
    typeof payload.label === "string" ? payload.label.trim() : undefined;

  if (!label) {
    return NextResponse.json(
      { error: "Question label is required" },
      { status: 400 },
    );
  }

  if (typeof payload.type !== "string") {
    return NextResponse.json(
      { error: "Question type is required" },
      { status: 400 },
    );
  }

  let type: FormQuestionType;

  try {
    assertValidQuestionType(payload.type);
    type = payload.type;
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }

  const description =
    typeof payload.description === "string"
      ? payload.description.trim()
      : null;

  const rawFieldKey =
    typeof payload.fieldKey === "string" ? payload.fieldKey.trim() : undefined;

  const fieldKey = rawFieldKey && rawFieldKey.length > 0
    ? rawFieldKey
    : resolveFieldKey(label);

  const required =
    typeof payload.required === "boolean" ? payload.required : false;

  const positionInput =
    typeof payload.position === "number" ? payload.position : null;

  const settings =
    typeof payload.settings === "object" && payload.settings !== null
      ? payload.settings
      : {};

  const sanitizedSettings = JSON.parse(JSON.stringify(settings));

  let position = positionInput;

  if (position === null) {
    const positionResult = await query<{ max_position: number | null }>(
      `SELECT MAX(position) AS max_position
         FROM form_questions
        WHERE form_id = $1`,
      [form.id],
    );

    const max = positionResult.rows[0]?.max_position ?? 0;
    position = Number.isFinite(max) ? max + 1 : 0;
  }

  try {
    const insertResult = await query<DbFormQuestionRow>(
      `INSERT INTO form_questions (
          form_id,
          field_key,
          question_type,
          label,
          description,
          required,
          position,
          settings
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
      [
        form.id,
        fieldKey,
        type,
        label,
        description,
        required,
        position,
        JSON.stringify(sanitizedSettings),
      ],
    );

    return NextResponse.json(
      { question: mapQuestionRowToClient(insertResult.rows[0]) },
      { status: 201 },
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      return NextResponse.json(
        { error: "Field key already exists for this form" },
        { status: 409 },
      );
    }

    console.error("Failed to create form question", error);
    return NextResponse.json(
      { error: "Failed to create question" },
      { status: 500 },
    );
  }
}
