import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrimaryBusinessForUser } from "@/lib/business";
import { query, type DbFormQuestionRow } from "@/lib/db";
import {
  assertValidQuestionType,
  getFormForBusiness,
  mapQuestionRowToClient,
} from "@/lib/forms";
import type { FormQuestionType } from "@/types/forms";

type RouteContext = {
  params: Promise<{
    formId: string;
    questionId: string;
  }>;
};

export async function PUT(request: Request, context: RouteContext) {
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
      { error: "Insufficient permissions to update questions" },
      { status: 403 },
    );
  }

  let payload: {
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

  const { formId, questionId } = await context.params;

  const form = await getFormForBusiness(formId, businessContext.business.id);

  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  const questionResult = await query<DbFormQuestionRow>(
    `SELECT *
       FROM form_questions
      WHERE id = $1
        AND form_id = $2
      LIMIT 1`,
    [questionId, form.id],
  );

  const question = questionResult.rows[0];

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const label =
    typeof payload.label === "string"
      ? payload.label.trim()
      : question.label;

  if (!label) {
    return NextResponse.json(
      { error: "Label cannot be empty" },
      { status: 400 },
    );
  }

  const description =
    typeof payload.description === "string"
      ? payload.description.trim()
      : question.description;

  const required =
    typeof payload.required === "boolean"
      ? payload.required
      : question.required;

  let type: FormQuestionType = question.question_type;

  if (typeof payload.type === "string") {
    try {
      assertValidQuestionType(payload.type);
      type = payload.type;
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 400 },
      );
    }
  }

  const position =
    typeof payload.position === "number"
      ? payload.position
      : question.position;

  const settings =
    typeof payload.settings === "object" && payload.settings !== null
      ? JSON.parse(JSON.stringify(payload.settings))
      : question.settings;

  const updateResult = await query<DbFormQuestionRow>(
    `UPDATE form_questions
        SET label = $1,
            description = $2,
            required = $3,
            question_type = $4,
            position = $5,
            settings = $6,
            updated_at = NOW()
      WHERE id = $7
        AND form_id = $8
      RETURNING *`,
    [
      label,
      description,
      required,
      type,
      position,
      JSON.stringify(settings),
      questionId,
      form.id,
    ],
  );

  return NextResponse.json({
    question: mapQuestionRowToClient(updateResult.rows[0]),
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
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
      { error: "Insufficient permissions to delete questions" },
      { status: 403 },
    );
  }

  const { formId, questionId } = await context.params;

  const form = await getFormForBusiness(formId, businessContext.business.id);

  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  await query(
    `DELETE FROM form_questions
      WHERE id = $1
        AND form_id = $2`,
    [questionId, form.id],
  );

  return NextResponse.json({ success: true });
}
