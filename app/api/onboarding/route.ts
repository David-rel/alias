import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, type DbBusinessRow, type DbBusinessTeamMemberRow } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerId = session.user.id;

  const businessResult = await query<DbBusinessRow>(
    "SELECT * FROM businesses WHERE owner_user_id = $1 LIMIT 1",
    [ownerId],
  );

  const business = businessResult.rows[0] ?? null;

  let teamMembers: DbBusinessTeamMemberRow[] = [];

  if (business) {
    const teamResult = await query<DbBusinessTeamMemberRow>(
      `SELECT * FROM business_team_members
       WHERE business_id = $1
       ORDER BY invited_at ASC`,
      [business.id],
    );
    teamMembers = teamResult.rows;
  }

  return NextResponse.json({
    business: business
      ? {
          id: business.id,
          businessCategory: business.business_category,
          industry: business.industry,
          description: business.description,
          logoPath: business.logo_path,
          companySize: business.company_size,
          location: business.location,
          featurePreferences: business.feature_preferences,
          ownerUserId: business.owner_user_id,
        }
      : null,
    teamMembers: teamMembers.map((member) => ({
      id: member.id,
      businessId: member.business_id,
      userId: member.user_id,
      email: member.email,
      role: member.role,
      inviteStatus: member.invite_status,
      invitedAt: member.invited_at,
      joinedAt: member.joined_at,
    })),
  });
}
