import { query, type DbBusinessRow, type DbBusinessTeamMemberRow } from "./db";

export type TeamAccess = {
  business: DbBusinessRow;
  viewerRole: "owner" | "admin" | "guest";
  membership: DbBusinessTeamMemberRow | null;
};

export async function getTeamAccess(userId: string): Promise<TeamAccess | null> {
  const ownerResult = await query<DbBusinessRow>(
    `SELECT *
       FROM businesses
      WHERE owner_user_id = $1
      LIMIT 1`,
    [userId],
  );

  const ownerBusiness = ownerResult.rows[0];

  if (ownerBusiness) {
    const membershipResult = await query<DbBusinessTeamMemberRow>(
      `SELECT *
         FROM business_team_members
        WHERE business_id = $1
          AND user_id = $2
        LIMIT 1`,
      [ownerBusiness.id, userId],
    );

    return {
      business: ownerBusiness,
      viewerRole: "owner",
      membership: membershipResult.rows[0] ?? null,
    };
  }

  const memberResult = await query<
    DbBusinessTeamMemberRow & {
      business_id: string;
    }
  >(
    `SELECT m.*, m.business_id
       FROM business_team_members m
      WHERE m.user_id = $1
      ORDER BY m.invited_at ASC
      LIMIT 1`,
    [userId],
  );

  const membership = memberResult.rows[0];

  if (!membership) {
    return null;
  }

  const businessResult = await query<DbBusinessRow>(
    `SELECT *
       FROM businesses
      WHERE id = $1
      LIMIT 1`,
    [membership.business_id],
  );

  const business = businessResult.rows[0];

  if (!business) {
    return null;
  }

  const role =
    membership.role === "owner" || membership.role === "admin" || membership.role === "guest"
      ? membership.role
      : "guest";

  return {
    business,
    viewerRole: role,
    membership,
  };
}
