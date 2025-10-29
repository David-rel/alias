import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrimaryBusinessForUser } from "@/lib/business";
import { query, type DbFormQuestionRow, type DbFormRow } from "@/lib/db";
import {
  assertValidFormStatus,
  getFormForBusiness,
  mapQuestionRowToClient,
} from "@/lib/forms";
import type { FormStatus } from "@/types/forms";

type FormWithCountsRow = DbFormRow & {
  response_count: string | null;
  last_submission_at: Date | null;
};

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

  const { formId } = await context.params;
  const businessContext = await getPrimaryBusinessForUser(session.user.id);

  if (!businessContext) {
    return NextResponse.json(
      { error: "No business found for user" },
      { status: 403 },
    );
  }

  const formResult = await query<FormWithCountsRow>(
    `SELECT f.*,
            COUNT(r.id)::text AS response_count,
            MAX(r.submitted_at) AS last_submission_at
       FROM forms f
  LEFT JOIN form_responses r
         ON r.form_id = f.id
        AND r.status = 'submitted'
      WHERE f.id = $1
        AND f.business_id = $2
      GROUP BY f.id
      LIMIT 1`,
    [formId, businessContext.business.id],
  );

  const form = formResult.rows[0];

  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  const questionsResult = await query<DbFormQuestionRow>(
    `SELECT *
       FROM form_questions
      WHERE form_id = $1
      ORDER BY position ASC, created_at ASC`,
    [form.id],
  );

  return NextResponse.json({
    form: {
      id: form.id,
      title: form.title,
      description: form.description,
      status: form.status,
      acceptingResponses: form.accepting_responses,
      shareId: form.share_id,
      submissionMessage: form.submission_message,
      coverImageUrl: form.cover_image_url,
      responseCount: Number.parseInt(form.response_count ?? "0", 10),
      lastSubmissionAt: form.last_submission_at
        ? form.last_submission_at.toISOString()
        : null,
      createdAt: form.created_at.toISOString(),
      updatedAt: form.updated_at.toISOString(),
    },
    questions: questionsResult.rows.map(mapQuestionRowToClient),
    role: businessContext.role,
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: {
    title?: unknown;
    description?: unknown;
    status?: unknown;
    acceptingResponses?: unknown;
    submissionMessage?: unknown;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { formId } = await context.params;
  const businessContext = await getPrimaryBusinessForUser(session.user.id);

  if (!businessContext) {
    return NextResponse.json(
      { error: "No business found for user" },
      { status: 403 },
    );
  }

  if (businessContext.role === "guest") {
    return NextResponse.json(
      { error: "Insufficient permissions to update forms" },
      { status: 403 },
    );
  }

  const existing = await getFormForBusiness(
    formId,
    businessContext.business.id,
  );

  if (!existing) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  const title =
    typeof payload.title === "string"
      ? payload.title.trim()
      : existing.title;

  if (!title) {
    return NextResponse.json(
      { error: "Title cannot be empty" },
      { status: 400 },
    );
  }

  const description =
    typeof payload.description === "string"
      ? payload.description.trim()
      : existing.description;

  let status: FormStatus = existing.status;

  if (typeof payload.status === "string") {
    try {
      assertValidFormStatus(payload.status);
      status = payload.status;
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 400 },
      );
    }
  }

  let acceptingResponses =
    typeof payload.acceptingResponses === "boolean"
      ? payload.acceptingResponses
      : existing.accepting_responses;

  if (status === "archived") {
    acceptingResponses = false;
  }

  const submissionMessage =
    typeof payload.submissionMessage === "string"
      ? payload.submissionMessage.trim()
      : existing.submission_message;

  const updateResult = await query<DbFormRow>(
    `UPDATE forms
        SET title = $1,
            description = $2,
            status = $3,
            accepting_responses = $4,
            submission_message = $5,
            updated_at = NOW()
      WHERE id = $6
        AND business_id = $7
      RETURNING *`,
    [
      title,
      description,
      status,
      acceptingResponses,
      submissionMessage,
      formId,
      businessContext.business.id,
    ],
  );

  const form = updateResult.rows[0];

  return NextResponse.json({
    form: {
      id: form.id,
      title: form.title,
      description: form.description,
      status: form.status,
      acceptingResponses: form.accepting_responses,
      shareId: form.share_id,
      submissionMessage: form.submission_message,
      coverImageUrl: form.cover_image_url,
      createdAt: form.created_at.toISOString(),
      updatedAt: form.updated_at.toISOString(),
    },
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { formId } = await context.params;
  const businessContext = await getPrimaryBusinessForUser(session.user.id);

  if (!businessContext) {
    return NextResponse.json(
      { error: "No business found for user" },
      { status: 403 },
    );
  }

  if (businessContext.role !== "owner" && businessContext.role !== "admin") {
    return NextResponse.json(
      { error: "Insufficient permissions to delete forms" },
      { status: 403 },
    );
  }

  await query(
    `DELETE FROM forms
      WHERE id = $1
        AND business_id = $2`,
    [formId, businessContext.business.id],
  );

  return NextResponse.json({ success: true });
}
