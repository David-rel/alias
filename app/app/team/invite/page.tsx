import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTeamAccess } from "@/lib/team";
import { query } from "@/lib/db";
import { DashboardShell } from "@/components/app/DashboardShell";
import { TeamInviteForm } from "@/components/app/TeamInviteForm";

export const metadata = {
  title: "Invite Teammates · Alias",
};

export default async function TeamInvitePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  if (session.user.onboardingCompleted === false) {
    redirect("/app/onboarding");
  }

  const access = await getTeamAccess(session.user.id);

  if (!access) {
    redirect("/app/team");
  }

  if (access.viewerRole === "guest") {
    redirect("/app/team");
  }

  const ownerNameResult = await query<{ company_name: string | null }>(
    `SELECT company_name FROM users WHERE id = $1 LIMIT 1`,
    [access.business.owner_user_id],
  );

  const displayName =
    ownerNameResult.rows[0]?.company_name ?? access.business.business_category ?? "Alias workspace";
  const userName = session.user.name ?? null;
  const userEmail = session.user.email ?? "";
  const initials = (userName ?? userEmail ?? "Alias")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <DashboardShell
      companyName={displayName}
      role={access.viewerRole}
      logoPath={access.business.logo_path ?? null}
      userName={userName}
      userEmail={userEmail}
      userInitials={initials || "A"}
    >
      <TeamInviteForm />
    </DashboardShell>
  );
}
