import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, type DbUserRow } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const result = await query<Pick<DbUserRow, "email_verified" | "onboarding_completed">>(
    "SELECT email_verified, onboarding_completed FROM users WHERE id = $1",
    [session.user.id],
  );

  const user = result.rows[0];

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    emailVerified: user.email_verified,
    onboardingCompleted: user.onboarding_completed,
  });
}
