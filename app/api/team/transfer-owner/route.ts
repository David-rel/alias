import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool, query, type DbBusinessTeamMemberRow } from "@/lib/db";
import { getTeamAccess } from "@/lib/team";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const memberId = (body as { memberId?: unknown }).memberId;

  if (typeof memberId !== "string" || memberId.length === 0) {
    return NextResponse.json({ error: "memberId is required." }, { status: 400 });
  }

  const access = await getTeamAccess(session.user.id);

  if (!access || access.viewerRole !== "owner") {
    return NextResponse.json({ error: "Only owners can transfer ownership." }, { status: 403 });
  }

  const businessId = access.business.id;
  const currentOwnerId = access.business.owner_user_id;

  const targetResult = await query<DbBusinessTeamMemberRow>(
    `SELECT *
       FROM business_team_members
      WHERE id = $1
        AND business_id = $2
      LIMIT 1`,
    [memberId, businessId],
  );

  const targetMember = targetResult.rows[0];

  if (!targetMember) {
    return NextResponse.json({ error: "Team member not found." }, { status: 404 });
  }

  if (targetMember.invite_status !== "accepted" || !targetMember.user_id) {
    return NextResponse.json(
      { error: "Only active members can become the owner." },
      { status: 400 },
    );
  }

  if (targetMember.user_id === currentOwnerId) {
    return NextResponse.json(
      { error: "This member already owns the workspace." },
      { status: 400 },
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE businesses
          SET owner_user_id = $1
        WHERE id = $2`,
      [targetMember.user_id, businessId],
    );

    await client.query(
      `UPDATE business_team_members
          SET role = 'admin',
              invite_status = 'accepted',
              joined_at = COALESCE(joined_at, NOW())
        WHERE business_id = $1
          AND user_id = $2`,
      [businessId, currentOwnerId],
    );

    await client.query(
      `UPDATE business_team_members
          SET role = 'owner',
              invite_status = 'accepted',
              joined_at = COALESCE(joined_at, NOW())
        WHERE id = $1`,
      [memberId],
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ownership transfer failed:", error);
    return NextResponse.json(
      { error: "Unable to transfer ownership." },
      { status: 500 },
    );
  } finally {
    client.release();
  }

  return NextResponse.json({ success: true });
}
