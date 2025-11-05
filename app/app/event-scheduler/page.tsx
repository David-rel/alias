import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrimaryBusinessForUser } from "@/lib/business";
import { getEventsForBusiness } from "@/lib/events";
import { query } from "@/lib/db";
import { DashboardShell } from "@/components/app/DashboardShell";
import { EventDashboard } from "@/components/event-scheduler/EventDashboard";

export const metadata = {
  title: "Event Scheduler - Alias",
  description:
    "Publish branded event pages, manage attendee capacity, and run check-in flows in minutes.",
};

export default async function EventSchedulerPage() {
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

  const events = await getEventsForBusiness(businessContext.business.id);

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

  const shareBase =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || undefined;
  const eventShareBaseUrl = shareBase
    ? `${shareBase}/event-scheduler`
    : undefined;

  const userName = userProfile.name ?? session.user.name ?? null;
  const userEmail = session.user.email ?? "";
  const profileImageUrl =
    userProfile.profile_image_url ?? session.user.image ?? null;

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
      <EventDashboard
        events={events}
        role={businessContext.role}
        shareBaseUrl={eventShareBaseUrl}
      />
    </DashboardShell>
  );
}
