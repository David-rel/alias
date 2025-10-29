import { notFound } from "next/navigation";
import { query, type DbFormQuestionRow, type DbFormRow } from "@/lib/db";
import { mapQuestionRowToClient } from "@/lib/forms";
import { PublicFormRenderer } from "@/components/forms/PublicFormRenderer";

type RouteParams = {
  params: Promise<{
    shareId: string;
  }>;
};

type PublicFormRow = DbFormRow & {
  business_name: string | null;
};

export async function generateMetadata({ params }: RouteParams) {
  const { shareId } = await params;

  const result = await query<PublicFormRow>(
    `SELECT f.*, b.name AS business_name
       FROM forms f
       JOIN businesses b ON b.id = f.business_id
      WHERE f.share_id = $1
      LIMIT 1`,
    [shareId],
  );

  const form = result.rows[0];

  if (!form) {
    return {
      title: "Alias Form",
    };
  }

  return {
    title: form.title ?? "Alias Form",
    description: form.description ?? undefined,
  };
}

export default async function PublicFormPage({ params }: RouteParams) {
  const { shareId } = await params;

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
    notFound();
  }

  const questionsResult = await query<DbFormQuestionRow>(
    `SELECT *
       FROM form_questions
      WHERE form_id = $1
      ORDER BY position ASC, created_at ASC`,
    [form.id],
  );

  const questions = questionsResult.rows.map(mapQuestionRowToClient);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#03162d] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,100,214,0.28),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(35,165,254,0.18),_transparent_45%)]" />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col items-center justify-center px-6 py-16">
        <PublicFormRenderer
        form={{
          id: form.id,
          shareId: form.share_id,
          title: form.title,
          description: form.description,
          submissionMessage: form.submission_message,
          acceptingResponses: form.accepting_responses,
          status: form.status,
          businessName: form.business_name,
          coverImageUrl: form.cover_image_url,
        }}
          questions={questions}
        />
        <p className="mt-8 text-center text-xs text-white/50">
          Powered by Alias — secure intake, automated workflows.
        </p>
      </div>
    </main>
  );
}
