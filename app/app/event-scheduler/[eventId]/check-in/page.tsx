import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrimaryBusinessForUser } from "@/lib/business";
import {
  getEventWithStats,
  getRegistrationsForEvent,
} from "@/lib/events";
import { query } from "@/lib/db";
import { DashboardShell } from "@/components/app/DashboardShell";
import { EventCheckInBoard } from "@/components/event-scheduler/EventCheckInBoard";

type PageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

export const metadata = {
  title: "Event check-in - Alias",
};

export default async function EventCheckInPage(props: PageProps) {
  const { eventId } = await props.params;
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

  const event = await getEventWithStats(eventId, businessContext.business.id);

  if (!event) {
    notFound();
  }

  const registrations = await getRegistrationsForEvent(
    event.id,
    businessContext.business.id,
  );

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
      <div className="space-y-8">
        <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#03162d] via-[#052041] to-[#0b3670] p-8 text-white shadow-[0_60px_160px_rgba(3,22,45,0.6)]">
          <p className="text-xs uppercase tracking-[0.45em] text-[#3eb6fd]">
            {event.title}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Check-in control center
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/75">
            Confirm arrivals in real time and keep capacity counts in sync across the dashboard.
          </p>
          {businessContext.role === "guest" ? (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-2 text-xs text-white/60">
              Guest accounts have read-only access. Ask an admin to grant check-in permissions.
            </p>
          ) : null}
        </header>
        <EventCheckInBoard
          event={event}
          initialRegistrations={registrations}
        />
      </div>
    </DashboardShell>
  );
}
