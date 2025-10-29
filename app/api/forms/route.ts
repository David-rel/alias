import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrimaryBusinessForUser } from "@/lib/business";
import { query, type DbFormRow } from "@/lib/db";
import {
  assertValidFormStatus,
  generateUniqueFormShareId,
} from "@/lib/forms";
import type { FormStatus } from "@/types/forms";

type FormListRow = DbFormRow & {
  response_count: string | null;
  last_submission_at: Date | null;
};

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await getPrimaryBusinessForUser(session.user.id);

  if (!context) {
    return NextResponse.json(
      { error: "No business found for user" },
      { status: 403 },
    );
  }

  const formsResult = await query<FormListRow>(
    `SELECT f.*,
            COUNT(r.id)::text AS response_count,
            MAX(r.submitted_at) AS last_submission_at
       FROM forms f
  LEFT JOIN form_responses r
         ON r.form_id = f.id
        AND r.status = 'submitted'
      WHERE f.business_id = $1
      GROUP BY f.id
      ORDER BY f.created_at DESC`,
    [context.business.id],
  );

  const forms = formsResult.rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    acceptingResponses: row.accepting_responses,
    shareId: row.share_id,
    submissionMessage: row.submission_message,
     coverImageUrl: row.cover_image_url,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    responseCount: Number.parseInt(row.response_count ?? "0", 10),
    lastSubmissionAt: row.last_submission_at
      ? row.last_submission_at.toISOString()
      : null,
  }));

  return NextResponse.json({
    forms,
    role: context.role,
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await getPrimaryBusinessForUser(session.user.id);

  if (!context) {
    return NextResponse.json(
      { error: "No business found for user" },
      { status: 403 },
    );
  }

  if (context.role === "guest") {
    return NextResponse.json(
      { error: "Insufficient permissions to create forms" },
      { status: 403 },
    );
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

  const title =
    typeof payload.title === "string" ? payload.title.trim() : undefined;

  if (!title) {
    return NextResponse.json(
      { error: "Title is required to create a form" },
      { status: 400 },
    );
  }

  const description =
    typeof payload.description === "string"
      ? payload.description.trim()
      : null;

  let status: FormStatus = "draft";

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

  const acceptingResponses =
    typeof payload.acceptingResponses === "boolean"
      ? payload.acceptingResponses
      : status !== "archived";

  const submissionMessage =
    typeof payload.submissionMessage === "string"
      ? payload.submissionMessage.trim()
      : null;

  let shareId: string;

  try {
    shareId = await generateUniqueFormShareId();
  } catch (error) {
    console.error("Failed to generate share id for new form", error);
    return NextResponse.json(
      { error: "Failed to provision share link" },
      { status: 500 },
    );
  }

  const insertResult = await query<DbFormRow>(
    `INSERT INTO forms (
        business_id,
        created_by_user_id,
        title,
        description,
        share_id,
        status,
        accepting_responses,
        submission_message,
        cover_image_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL)
      RETURNING *`,
    [
      context.business.id,
      session.user.id,
      title,
      description,
      shareId,
      status,
      acceptingResponses,
      submissionMessage,
    ],
  );

  const form = insertResult.rows[0];

  return NextResponse.json(
    {
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
        responseCount: 0,
        lastSubmissionAt: null,
      },
    },
    { status: 201 },
  );
}
