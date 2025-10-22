import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerId = session.user.id;

  await query(
    `UPDATE users
     SET onboarding_completed = TRUE
     WHERE id = $1`,
    [ownerId],
  );

  return NextResponse.json({ success: true });
}
