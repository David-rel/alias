import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { DashboardShell } from "@/components/app/DashboardShell";
import { TeamManager } from "@/components/app/TeamManager";

type BusinessRecord = {
  id: string;
  company_name: string | null;
  business_category: string | null;
  industry: string | null;
  company_size: string | null;
  location: string | null;
  logo_path: string | null;
  viewer_role?: "owner" | "admin" | "guest" | null;
};

type TeamMemberRecord = {
  id: string;
  email: string;
  role: "owner" | "admin" | "guest";
  invite_status: "pending" | "accepted" | "declined";
  invited_at: Date;
  joined_at: Date | null;
  user_name: string | null;
  profile_image_url: string | null;
  phone_number: string | null;
  logged_in_status: boolean;
  last_online_at: Date | null;
  last_offline_at: Date | null;
};

export const metadata = {
  title: "Team · Alias",
};

export default async function TeamPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  if (session.user.onboardingCompleted === false) {
    redirect("/app/onboarding");
  }

  const userId = session.user.id;

  // Determine the business context for the authenticated user.
  const ownerBusiness = await query<
    BusinessRecord & {
      company_name: string | null;
    }
  >(
    `SELECT b.id,
            COALESCE(u.company_name, b.business_category) AS company_name,
            b.business_category,
            b.industry,
            b.company_size,
            b.location,
            b.logo_path
       FROM businesses b
       LEFT JOIN users u ON u.id = b.owner_user_id
      WHERE b.owner_user_id = $1
      LIMIT 1`,
    [userId]
  );

  let business = ownerBusiness.rows[0] ?? null;
  let viewerRole: "owner" | "admin" | "guest" = business ? "owner" : "guest";

  if (!business) {
    const memberBusiness = await query<
      BusinessRecord & {
        viewer_role: "owner" | "admin" | "guest" | null;
      }
    >(
      `SELECT b.id,
              COALESCE(owner.company_name, b.business_category) AS company_name,
              b.business_category,
              b.industry,
              b.company_size,
              b.location,
              b.logo_path,
              m.role AS viewer_role
         FROM business_team_members m
         JOIN businesses b ON b.id = m.business_id
         LEFT JOIN users owner ON owner.id = b.owner_user_id
        WHERE m.user_id = $1
        ORDER BY m.invited_at ASC
        LIMIT 1`,
      [userId]
    );

    business = memberBusiness.rows[0] ?? null;
    const candidateRole = memberBusiness.rows[0]?.viewer_role ?? null;
    viewerRole =
      candidateRole === "owner" ||
      candidateRole === "admin" ||
      candidateRole === "guest"
        ? candidateRole
        : "guest";
  }

  if (!business) {
    // Fetch user profile image
    const userProfileResult = await query<{ profile_image_url: string | null }>(
      `SELECT profile_image_url FROM users WHERE id = $1 LIMIT 1`,
      [session.user.id]
    );

    const profileImageUrl =
      userProfileResult.rows[0]?.profile_image_url ?? null;

    return (
      <DashboardShell
        companyName="Alias workspace"
        role="guest"
        logoPath={null}
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? ""}
        userInitials={(session.user.name ?? session.user.email ?? "Alias")
          .slice(0, 2)
          .toUpperCase()}
        profileImageUrl={profileImageUrl}
      >
        <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-white/10 bg-neutral-900/80 p-12 text-center text-neutral-200">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              No workspace yet
            </h1>
            <p className="mt-3 text-sm text-neutral-400">
              Once you complete onboarding and create a workspace you&apos;ll
              see your teammates listed here.
            </p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const teamMembersResult = await query<TeamMemberRecord>(
    `SELECT m.id,
            m.email,
            m.role,
            m.invite_status,
            m.invited_at,
            m.joined_at,
            u.name AS user_name,
            u.profile_image_url,
            u.phone_number,
            u.logged_in_status,
            u.last_online_at,
            u.last_offline_at
       FROM business_team_members m
       LEFT JOIN users u ON u.id = m.user_id
      WHERE m.business_id = $1
      ORDER BY
        CASE WHEN m.role = 'owner' THEN 0 WHEN m.role = 'admin' THEN 1 ELSE 2 END,
        m.invited_at ASC`,
    [business.id]
  );

  const teamMembers = teamMembersResult.rows;

  const shellUserName = session.user.name ?? null;
  const shellUserEmail = session.user.email ?? "";
  const shellInitials = (shellUserName ?? shellUserEmail ?? "Alias")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Fetch user profile image
  const userProfileResult = await query<{ profile_image_url: string | null }>(
    `SELECT profile_image_url FROM users WHERE id = $1 LIMIT 1`,
    [session.user.id]
  );

  const profileImageUrl = userProfileResult.rows[0]?.profile_image_url ?? null;

  return (
    <DashboardShell
      companyName={
        business.company_name ?? business.business_category ?? "Alias workspace"
      }
      role={viewerRole}
      logoPath={business.logo_path}
      userName={shellUserName}
      userEmail={shellUserEmail}
      userInitials={shellInitials || "A"}
      profileImageUrl={profileImageUrl}
    >
      <TeamManager
        viewerRole={viewerRole}
        business={{
          id: business.id,
          name: business.company_name ?? "Untitled company",
          industry: business.industry,
          companySize: business.company_size,
          location: business.location,
        }}
        initialMembers={teamMembers.map((member) => ({
          id: member.id,
          email: member.email,
          name: member.user_name,
          role: member.role,
          inviteStatus: member.invite_status,
          invitedAt: member.invited_at.toISOString(),
          joinedAt: member.joined_at ? member.joined_at.toISOString() : null,
          profileImageUrl: member.profile_image_url,
          phoneNumber: member.phone_number,
          loggedInStatus: member.logged_in_status,
          lastOnlineAt: member.last_online_at
            ? member.last_online_at.toISOString()
            : null,
          lastOfflineAt: member.last_offline_at
            ? member.last_offline_at.toISOString()
            : null,
        }))}
      />
    </DashboardShell>
  );
}
