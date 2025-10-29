import { NextResponse } from "next/server";
import {
  query,
  type DbFormQuestionRow,
  type DbFormRow,
} from "@/lib/db";
import { mapQuestionRowToClient } from "@/lib/forms";

type RouteContext = {
  params: Promise<{
    shareId: string;
  }>;
};

type PublicFormRow = DbFormRow & {
  business_name: string | null;
};

export async function GET(_request: Request, context: RouteContext) {
  const { shareId } = await context.params;

  const formResult = await query<PublicFormRow>(
    `SELECT f.*, b.name AS business_name
       FROM forms f
       JOIN businesses b ON b.id = f.business_id
      WHERE f.share_id = $1
      LIMIT 1`,
    [shareId],
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
      shareId: form.share_id,
      title: form.title,
      description: form.description,
      businessName: form.business_name,
      status: form.status,
      acceptingResponses: form.accepting_responses,
      submissionMessage: form.submission_message,
      coverImageUrl: form.cover_image_url,
    },
    questions: questionsResult.rows.map(mapQuestionRowToClient),
  });
}
