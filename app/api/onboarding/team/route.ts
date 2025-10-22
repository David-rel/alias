import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { hash } from "bcryptjs";
import { authOptions } from "@/lib/auth";
import {
  query,
  type DbBusinessRow,
  type DbBusinessTeamMemberRow,
  type DbUserRow,
} from "@/lib/db";
import { sendTeamInviteEmail } from "@/lib/email";

type RawMember = {
  email?: unknown;
  role?: unknown;
};

type NormalizedMember = {
  email: string;
  role: "admin" | "guest";
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const MAX_MEMBERS = 20;
const ALLOWED_MEMBER_ROLES = new Set<NormalizedMember["role"]>([
  "admin",
  "guest",
]);

function normalizeMembers(
  input: unknown,
  ownerEmailLower: string | null,
): NormalizedMember[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const unique = new Map<string, NormalizedMember>();

  for (const raw of input as RawMember[]) {
    if (!raw || typeof raw !== "object") {
      continue;
    }

    const emailRaw =
      typeof raw.email === "string" ? raw.email : String(raw.email ?? "");
    const email = emailRaw.trim().toLowerCase();

    if (!email || !EMAIL_REGEX.test(email)) {
      continue;
    }

    if (ownerEmailLower && email === ownerEmailLower) {
      continue;
    }

    const rawRole =
      typeof raw.role === "string" ? raw.role.trim().toLowerCase() : "guest";

    const role = ALLOWED_MEMBER_ROLES.has(
      rawRole as NormalizedMember["role"],
    )
      ? (rawRole as NormalizedMember["role"])
      : "guest";

    if (!unique.has(email)) {
      unique.set(email, {
        email,
        role,
      });
    }
  }

  return Array.from(unique.values()).slice(0, MAX_MEMBERS);
}

async function ensureBusiness(ownerId: string) {
  const result = await query<DbBusinessRow>(
    `INSERT INTO businesses (owner_user_id)
     VALUES ($1)
     ON CONFLICT (owner_user_id) DO UPDATE SET
       owner_user_id = EXCLUDED.owner_user_id
     RETURNING *`,
    [ownerId],
  );

  return result.rows[0];
}

async function getOwnerProfile(ownerId: string) {
  const result = await query<Pick<DbUserRow, "email" | "name" | "company_name">>(
    `SELECT email, name, company_name
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [ownerId],
  );

  return result.rows[0] ?? null;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerId = session.user.id;
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const ownerProfile = await getOwnerProfile(ownerId);

  if (!ownerProfile?.email) {
    return NextResponse.json({ error: "Owner email not found." }, { status: 500 });
  }

  const ownerEmail = ownerProfile.email;
  const ownerEmailLower = ownerEmail.toLowerCase();

  const normalizedMembers = normalizeMembers(
    (body as { members?: unknown }).members,
    ownerEmailLower,
  );

  if (normalizedMembers.length === 0) {
    return NextResponse.json(
      { error: "Please provide at least one teammate email." },
      { status: 400 },
    );
  }

  const business = await ensureBusiness(ownerId);

  if (!business) {
    return NextResponse.json(
      { error: "Unable to determine business context." },
      { status: 500 },
    );
  }

  if (ownerEmail) {
    await query(
      `INSERT INTO business_team_members (
         business_id,
         user_id,
         email,
         role,
         invite_status,
         joined_at
       ) VALUES ($1, $2, $3, $4, 'accepted', NOW())
       ON CONFLICT (business_id, email) DO UPDATE SET
         user_id = COALESCE(business_team_members.user_id, EXCLUDED.user_id),
         role = EXCLUDED.role,
         invite_status = 'accepted',
         joined_at = COALESCE(business_team_members.joined_at, EXCLUDED.joined_at)`,
      [business.id, ownerId, ownerEmail.toLowerCase(), "owner"],
    );
  }

  for (const member of normalizedMembers) {
    const userLookup = await query<Pick<DbUserRow, "id">>(
      "SELECT id FROM users WHERE email = $1 LIMIT 1",
      [member.email],
    );

    let linkedUserId = userLookup.rows[0]?.id ?? null;
    const resetCode = randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);

    if (!linkedUserId) {
      const randomPassword = randomBytes(12).toString("base64url");
      const passwordHash = await hash(randomPassword, 12);

      const insertResult = await query<Pick<DbUserRow, "id">>(
        `INSERT INTO users (
           email,
           password_hash,
           email_verified,
           onboarding_completed,
           password_reset_code,
           password_reset_expires,
           company_name
         ) VALUES ($1, $2, TRUE, TRUE, $3, $4, $5)
         RETURNING id`,
        [
          member.email,
          passwordHash,
          resetCode,
          resetExpires,
          ownerProfile.company_name,
        ],
      );

      linkedUserId = insertResult.rows[0]?.id ?? null;
    } else {
      await query(
        `UPDATE users
         SET onboarding_completed = TRUE,
             email_verified = TRUE,
             password_reset_code = $2,
             password_reset_expires = $3,
             updated_at = NOW()
         WHERE id = $1`,
        [linkedUserId, resetCode, resetExpires],
      );
    }

    const result = await query<DbBusinessTeamMemberRow>(
      `INSERT INTO business_team_members (
         business_id,
         user_id,
         email,
         role,
         invite_status
       ) VALUES ($1, $2, $3, $4, 'pending')
       ON CONFLICT (business_id, email) DO UPDATE SET
         role = EXCLUDED.role,
         user_id = COALESCE(business_team_members.user_id, EXCLUDED.user_id),
         invite_status = CASE
           WHEN business_team_members.invite_status = 'accepted'
             THEN business_team_members.invite_status
           ELSE 'pending'
         END
       RETURNING *`,
      [business.id, linkedUserId, member.email, member.role],
    );

    if (result.rows[0]) {
      const inviterName =
        ownerProfile.name?.trim() ||
        (typeof session.user.name === "string" && session.user.name.trim()) ||
        ownerProfile.email;

      const businessName =
        business.business_category ||
        ownerProfile.company_name ||
        "your Alias workspace";

      try {
        await sendTeamInviteEmail({
          recipient: member.email,
          inviterName,
          businessName,
          role: member.role,
          resetCode,
          expiresAt: resetExpires,
        });
      } catch (emailError) {
        console.error("Failed to send team invite email:", emailError);
      }
    }
  }

  const teamResult = await query<DbBusinessTeamMemberRow>(
    `SELECT *
     FROM business_team_members
     WHERE business_id = $1
     ORDER BY invited_at ASC`,
    [business.id],
  );

  return NextResponse.json({
    success: true,
    businessId: business.id,
    teamMembers: teamResult.rows.map((member) => ({
      id: member.id,
      email: member.email,
      role: member.role,
      inviteStatus: member.invite_status,
      joinedAt: member.joined_at,
      userId: member.user_id,
    })),
  });
}
