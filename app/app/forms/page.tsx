import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { getPrimaryBusinessForUser } from "@/lib/business";
import { DashboardShell } from "@/components/app/DashboardShell";
import { FormsDashboard } from "@/components/forms/FormsDashboard";
import type { FormSummary } from "@/types/forms";

export const metadata = {
  title: "Forms - Alias",
  description:
    "Create and manage unlimited forms with secure file uploads and real-time analytics.",
};

export default async function FormsPage() {
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
    redirect("/app");
  }

  const formsResult = await query<{
    id: string;
    title: string;
    status: "draft" | "active" | "archived";
    accepting_responses: boolean;
    share_id: string;
    cover_image_url: string | null;
    response_count: string | null;
    last_submission_at: Date | null;
  }>(
    `SELECT f.id,
            f.title,
            f.status,
            f.accepting_responses,
            f.share_id,
            f.cover_image_url,
            COUNT(r.id)::text AS response_count,
            MAX(r.submitted_at) AS last_submission_at
       FROM forms f
  LEFT JOIN form_responses r
         ON r.form_id = f.id
        AND r.status = 'submitted'
      WHERE f.business_id = $1
      GROUP BY f.id
      ORDER BY f.created_at DESC`,
    [businessContext.business.id],
  );

  const forms: FormSummary[] = formsResult.rows.map((row) => ({
    id: row.id,
    shareId: row.share_id,
    title: row.title,
    status: row.status,
    acceptingResponses: row.accepting_responses,
    coverImageUrl: row.cover_image_url,
    responseCount: Number.parseInt(row.response_count ?? "0", 10),
    lastSubmissionAt: row.last_submission_at
      ? row.last_submission_at.toISOString()
      : null,
  }));

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
    businessContext.business.description ??
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
      <FormsDashboard
        forms={forms}
        role={businessContext.role}
        shareBaseUrl={formsShareBaseUrl}
      />
    </DashboardShell>
  );
}
