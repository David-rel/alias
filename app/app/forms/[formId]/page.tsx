import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  query,
  type DbFormAnswerRow,
  type DbFormQuestionRow,
  type DbFormResponseRow,
  type DbFormRow,
} from "@/lib/db";
import { getPrimaryBusinessForUser } from "@/lib/business";
import { mapQuestionRowToClient } from "@/lib/forms";
import { DashboardShell } from "@/components/app/DashboardShell";
import { FormWorkspace } from "@/components/forms/FormWorkspace";
import type {
  FormQuestionClientShape,
  FormResponseRecord,
  FormStatus,
} from "@/types/forms";

type RouteContext = {
  params: Promise<{
    formId: string;
  }>;
};

type FormWithCountsRow = DbFormRow & {
  response_count: string | null;
  last_submission_at: Date | null;
};

type AnswerJoinedRow = DbFormAnswerRow & {
  field_key: string;
  question_type: string;
  question_label: string;
};

export async function generateMetadata({ params }: RouteContext) {
  const { formId } = await params;

  const formResult = await query<{ title: string | null }>(
    `SELECT title
       FROM forms
      WHERE id = $1
      LIMIT 1`,
    [formId],
  );

  const formTitle = formResult.rows[0]?.title?.trim() ?? null;

  return {
    title: formTitle ? `${formTitle} – Form` : "Form",
  };
}

export default async function FormDetailPage({ params }: RouteContext) {
  const { formId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  if (session.user.onboardingCompleted === false) {
    redirect("/app/onboarding");
  }

  const userId = session.user.id;
  const businessContext = await getPrimaryBusinessForUser(userId);

  if (!businessContext) {
    redirect("/app/forms");
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
    redirect("/app/forms");
  }

  const sanitizedForm = {
    id: form.id,
    shareId: form.share_id,
    title: form.title,
    description: form.description,
    status: form.status as FormStatus,
    acceptingResponses: form.accepting_responses,
    submissionMessage: form.submission_message,
    coverImageUrl: form.cover_image_url,
    createdAt: form.created_at.toISOString(),
    updatedAt: form.updated_at.toISOString(),
    responseCount: Number.parseInt(form.response_count ?? "0", 10),
    lastSubmissionAt: form.last_submission_at
      ? form.last_submission_at.toISOString()
      : null,
  };

  const questionsResult = await query<DbFormQuestionRow>(
    `SELECT *
       FROM form_questions
      WHERE form_id = $1
      ORDER BY position ASC, created_at ASC`,
    [form.id],
  );

  const questions: FormQuestionClientShape[] = questionsResult.rows.map(
    mapQuestionRowToClient,
  );

  const responsesResult = await query<DbFormResponseRow>(
    `SELECT *
       FROM form_responses
      WHERE form_id = $1
      ORDER BY submitted_at DESC`,
    [form.id],
  );

  const responses = responsesResult.rows;
  const responseIds = responses.map((row) => row.id);

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
        const items = acc.get(row.response_id) ?? [];
        items.push(row);
        acc.set(row.response_id, items);
        return acc;
      },
      new Map<string, AnswerJoinedRow[]>(),
    );
  }

  const responseRecords: FormResponseRecord[] = responses.map((response) => {
    const answers = answersByResponse.get(response.id) ?? [];

    return {
      id: response.id,
      status: response.status,
      submittedAt: response.submitted_at.toISOString(),
      submittedByUserId: response.submitted_by_user_id,
      submittedIp: response.submitted_ip,
      submittedUserAgent: response.submitted_user_agent,
      metadata: response.metadata,
      answers: answers.map((answer) => {
        const rawJson = answer.value_json;

        return {
          id: answer.id,
          questionId: answer.question_id,
          fieldKey: answer.field_key,
          label: answer.question_label,
          type: answer.question_type as FormQuestionClientShape["type"],
          valueText:
            typeof answer.value_text === "string"
              ? answer.value_text
              : typeof rawJson === "string"
                ? rawJson
                : null,
          valueNumber: answer.value_number
            ? Number(answer.value_number)
            : null,
          valueBoolean: answer.value_boolean,
          valueDate: answer.value_date
            ? answer.value_date.toISOString()
            : null,
          valueList: Array.isArray(rawJson)
            ? rawJson.map((item) => String(item))
            : null,
          file: answer.file_path
            ? {
                url: answer.file_path,
                name: answer.file_name,
                size: answer.file_size,
                contentType: answer.file_content_type,
              }
            : null,
        };
      }),
    };
  });

  const summary = {
    total: responses.length,
    submitted: responses.filter((row) => row.status === "submitted").length,
    flagged: responses.filter((row) => row.status === "flagged").length,
    spam: responses.filter((row) => row.status === "spam").length,
    deleted: responses.filter((row) => row.status === "deleted").length,
  };

  const userResult = await query<{
    name: string | null;
    profile_image_url: string | null;
  }>(
    `SELECT name, profile_image_url
       FROM users
      WHERE id = $1`,
    [userId],
  );

  const userProfile = userResult.rows[0] ?? {
    name: null,
    profile_image_url: null,
  };

  const companyName =
    businessContext.business.name ??
    session.user.name ??
    session.user.email ??
    "Alias workspace";

  const userName = userProfile.name ?? session.user.name ?? null;
  const userEmail = session.user.email ?? "";
  const profileImageUrl = userProfile.profile_image_url;

  const userInitials = userName
    ? userName
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0] ?? "")
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : userEmail.slice(0, 2).toUpperCase();

  const shareBaseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || undefined;
  const formsShareBaseUrl = shareBaseUrl
    ? `${shareBaseUrl}/forms`
    : undefined;

  return (
    <DashboardShell
      companyName={companyName}
      role={businessContext.role}
      logoPath={businessContext.business.logo_path ?? null}
      userName={userName}
      userEmail={userEmail}
      userInitials={userInitials || "A"}
      profileImageUrl={profileImageUrl}
    >
      <FormWorkspace
        form={sanitizedForm}
        questions={questions}
        responses={responseRecords}
        summary={summary}
        role={businessContext.role}
        shareBaseUrl={formsShareBaseUrl}
      />
    </DashboardShell>
  );
}
