import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrimaryBusinessForUser } from "@/lib/business";
import { getCalendarSummaries } from "@/lib/appointments";
import { query } from "@/lib/db";
import { DashboardShell } from "@/components/app/DashboardShell";
import { SchedulerDashboard } from "@/components/appointment-scheduler/SchedulerDashboard";

export const metadata = {
  title: "Appointment Scheduler - Alias",
  description:
    "Create branded booking pages, sync with Google Calendar, and orchestrate every appointment in minutes.",
};

export default async function AppointmentSchedulerPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  if (session.user.onboardingCompleted === false) {
    redirect("/app/onboarding");
  }

  const businessContext = await getPrimaryBusinessForUser(session.user.id);

  if (!businessContext) {
    redirect("/app");
  }

  const calendars = await getCalendarSummaries(businessContext.business.id, {
    days: 21,
  });

  const userResult = await query<{
    name: string | null;
    profile_image_url: string | null;
  }>(
    `SELECT name, profile_image_url
       FROM users
      WHERE id = $1`,
    [session.user.id],
  );

  const userProfile = userResult.rows[0] ?? {
    name: session.user.name ?? null,
    profile_image_url: session.user.image ?? null,
  };

  const companyName =
    businessContext.business.name ??
    businessContext.business.description ??
    session.user.name ??
    session.user.email ??
    "Alias workspace";

  const shareBaseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || undefined;
  const schedulerShareBaseUrl = shareBaseUrl
    ? `${shareBaseUrl}/appointment-scheduler`
    : undefined;

  const userName = userProfile.name ?? session.user.name ?? null;
  const userEmail = session.user.email ?? "";
  const profileImageUrl = userProfile.profile_image_url ?? session.user.image ?? null;

  const userInitials = userName
    ? userName
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0] ?? "")
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : userEmail.slice(0, 2).toUpperCase();

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
      <SchedulerDashboard
        calendars={calendars}
        role={businessContext.role}
        shareBaseUrl={schedulerShareBaseUrl}
      />
    </DashboardShell>
  );
}
