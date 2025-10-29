import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrimaryBusinessForUser } from "@/lib/business";
import {
  query,
  type DbFormAnswerRow,
  type DbFormResponseRow,
} from "@/lib/db";
import { getFormForBusiness } from "@/lib/forms";
import type { FormQuestionType } from "@/types/forms";

type RouteContext = {
  params: Promise<{
    formId: string;
  }>;
};

type AnswerJoinedRow = DbFormAnswerRow & {
  field_key: string;
  question_type: FormQuestionType;
  question_label: string;
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

  const responsesResult = await query<DbFormResponseRow>(
    `SELECT *
       FROM form_responses
      WHERE form_id = $1
      ORDER BY submitted_at DESC`,
    [form.id],
  );

  const responses = responsesResult.rows;
  const responseIds = responses.map((response) => response.id);

  let answersByResponse = new Map<string, AnswerJoinedRow[]>();

  if (responseIds.length > 0) {
    const answersResult = await query<AnswerJoinedRow>(
      `SELECT a.*,
              q.field_key,
              q.question_type,
              q.label AS question_label
         FROM form_answers a
         JOIN form_questions q ON q.id = a.question_id
        WHERE a.response_id = ANY($1::uuid[])
        ORDER BY q.position ASC`,
      [responseIds],
    );

    answersByResponse = answersResult.rows.reduce(
      (acc, row) => {
        const list = acc.get(row.response_id) ?? [];
        list.push(row);
        acc.set(row.response_id, list);
        return acc;
      },
      new Map<string, AnswerJoinedRow[]>(),
    );
  }

  const formatted = responses.map((response) => {
    const answers = answersByResponse.get(response.id) ?? [];

    return {
      id: response.id,
      status: response.status,
      submittedAt: response.submitted_at.toISOString(),
      metadata: response.metadata,
      submittedByUserId: response.submitted_by_user_id,
      submittedIp: response.submitted_ip,
      submittedUserAgent: response.submitted_user_agent,
      answers: answers.map((answer) => ({
        id: answer.id,
        questionId: answer.question_id,
        fieldKey: answer.field_key,
        label: answer.question_label,
        type: answer.question_type,
        valueText:
          typeof answer.value_text === "string"
            ? answer.value_text
            : typeof answer.value_json === "string"
              ? answer.value_json
              : null,
        valueNumber: answer.value_number ? Number(answer.value_number) : null,
        valueBoolean: answer.value_boolean,
        valueDate: answer.value_date ? answer.value_date.toISOString() : null,
        valueList: Array.isArray(answer.value_json)
          ? answer.value_json.map((item) => String(item))
          : null,
        file: answer.file_path
          ? {
              url: answer.file_path,
              name: answer.file_name,
              size: answer.file_size,
              contentType: answer.file_content_type,
            }
          : null,
      })),
    };
  });

  const summary = {
    total: responses.length,
    submitted: responses.filter((row) => row.status === "submitted").length,
    flagged: responses.filter((row) => row.status === "flagged").length,
    spam: responses.filter((row) => row.status === "spam").length,
    deleted: responses.filter((row) => row.status === "deleted").length,
  };

  return NextResponse.json({
    responses: formatted,
    summary,
  });
}
