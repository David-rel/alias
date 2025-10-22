import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, type DbBusinessTeamMemberRow } from "@/lib/db";
import { getTeamAccess } from "@/lib/team";

type Params = {
  memberId: string;
};

export async function PATCH(request: Request, context: { params: Promise<Params> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { memberId } = await context.params;
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const desiredRole = (body as { role?: unknown }).role;
  if (desiredRole !== "admin" && desiredRole !== "guest") {
    return NextResponse.json({ error: "Unsupported role update." }, { status: 400 });
  }

  const access = await getTeamAccess(session.user.id);

  if (!access) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  const viewerRole = access.viewerRole;

  if (viewerRole === "guest") {
    return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
  }

  const memberResult = await query<DbBusinessTeamMemberRow>(
    `SELECT * FROM business_team_members WHERE id = $1 AND business_id = $2 LIMIT 1`,
    [memberId, access.business.id],
  );

  const member = memberResult.rows[0];

  if (!member) {
    return NextResponse.json({ error: "Team member not found." }, { status: 404 });
  }

  if (member.role === "owner") {
    return NextResponse.json({ error: "Reassign ownership before updating this member." }, { status: 400 });
  }

  if (viewerRole === "admin" && member.role !== "guest") {
    return NextResponse.json({ error: "Admins may only modify guests." }, { status: 403 });
  }

  await query(
    `UPDATE business_team_members
        SET role = $1,
            invite_status = CASE WHEN invite_status = 'declined' THEN 'pending' ELSE invite_status END
      WHERE id = $2`,
    [desiredRole, memberId],
  );

  const updatedResult = await query<DbBusinessTeamMemberRow>(
    `SELECT * FROM business_team_members WHERE id = $1`,
    [memberId],
  );

  const updatedMember = updatedResult.rows[0];

  return NextResponse.json({
    id: updatedMember.id,
    role: updatedMember.role,
    inviteStatus: updatedMember.invite_status,
    joinedAt: updatedMember.joined_at,
  });
}

export async function DELETE(_request: Request, context: { params: Promise<Params> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await getTeamAccess(session.user.id);

  if (!access) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  const viewerRole = access.viewerRole;

  if (viewerRole === "guest") {
    return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
  }

  const { memberId } = await context.params;

  const memberResult = await query<DbBusinessTeamMemberRow>(
    `SELECT * FROM business_team_members WHERE id = $1 AND business_id = $2 LIMIT 1`,
    [memberId, access.business.id],
  );

  const member = memberResult.rows[0];

  if (!member) {
    return NextResponse.json({ error: "Team member not found." }, { status: 404 });
  }

  if (member.role === "owner") {
    return NextResponse.json({ error: "Transfer ownership before removing this member." }, { status: 400 });
  }

  if (viewerRole === "admin" && member.role !== "guest") {
    return NextResponse.json({ error: "Admins may only remove guests." }, { status: 403 });
  }

  await query(
    `DELETE FROM business_team_members WHERE id = $1`,
    [memberId],
  );

  if (member.user_id) {
    const [{ rows: ownershipRows }, { rows: membershipRows }] = await Promise.all([
      query<{ count: string }>(
        `SELECT COUNT(*)::INT AS count
           FROM businesses
          WHERE owner_user_id = $1`,
        [member.user_id],
      ),
      query<{ count: string }>(
        `SELECT COUNT(*)::INT AS count
           FROM business_team_members
          WHERE user_id = $1`,
        [member.user_id],
      ),
    ]);

    const ownsWorkspaces = Number.parseInt(ownershipRows[0]?.count ?? "0", 10) > 0;
    const hasMemberships = Number.parseInt(membershipRows[0]?.count ?? "0", 10) > 0;

    if (!ownsWorkspaces && !hasMemberships) {
      await query(`DELETE FROM users WHERE id = $1`, [member.user_id]);
    }
  }

  return NextResponse.json({ success: true });
}
