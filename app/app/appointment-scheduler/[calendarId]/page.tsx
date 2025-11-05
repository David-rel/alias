import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrimaryBusinessForUser } from "@/lib/business";
import {
  getAvailabilityRulesForCalendar,
  getBookingsForCalendars,
  getCalendarById,
  getAvailabilityWindowForCalendar,
} from "@/lib/appointments";
import { query } from "@/lib/db";
import { DashboardShell } from "@/components/app/DashboardShell";
import { CalendarWorkspace } from "@/components/appointment-scheduler/CalendarWorkspace";

type PageProps = {
  params: Promise<{
    calendarId: string;
  }>;
};

export default async function CalendarDetailPage(props: PageProps) {
  const { calendarId } = await props.params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  if (session.user.onboardingCompleted === false) {
    redirect("/app/onboarding");
  }

  const context = await getPrimaryBusinessForUser(session.user.id);

  if (!context) {
    redirect("/app");
  }

  const calendar = await getCalendarById(calendarId, context.business.id);

  if (!calendar) {
    redirect("/app/appointment-scheduler");
  }

  const [rules, bookings, availability, userResult] = await Promise.all([
    getAvailabilityRulesForCalendar(calendar.id),
    getBookingsForCalendars([calendar.id], {
      includeCancelled: true,
      upcomingOnly: false,
    }),
    getAvailabilityWindowForCalendar({
      calendar,
      startDate: new Date(),
    }),
    query<{
      name: string | null;
      profile_image_url: string | null;
    }>(
      `SELECT name, profile_image_url
         FROM users
        WHERE id = $1`,
      [session.user.id],
    ),
  ]);

  const userProfile = userResult.rows[0] ?? {
    name: session.user.name ?? null,
    profile_image_url: session.user.image ?? null,
  };

  const companyName =
    context.business.name ??
    context.business.description ??
    session.user.name ??
    session.user.email ??
    "Alias workspace";

  const shareBaseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || undefined;

  const calendarShareUrl = shareBaseUrl
    ? `${shareBaseUrl}/appointment-scheduler/${calendar.shareId}`
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
      role={context.role}
      logoPath={context.business.logo_path ?? null}
      userName={userName}
      userEmail={userEmail}
      userInitials={userInitials || "A"}
      profileImageUrl={profileImageUrl}
    >
      <CalendarWorkspace
        calendar={calendar}
        rules={rules}
        availability={availability}
        bookings={bookings}
        shareUrl={calendarShareUrl}
        role={context.role}
      />
    </DashboardShell>
  );
}
