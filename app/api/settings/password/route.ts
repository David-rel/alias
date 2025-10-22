import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { compare, hash } from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

const MIN_PASSWORD_LENGTH = 8;

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const data = payload as Record<string, unknown>;
  const currentPassword = typeof data.currentPassword === "string" ? data.currentPassword : "";
  const nextPassword = typeof data.newPassword === "string" ? data.newPassword : "";

  if (!currentPassword || !nextPassword) {
    return NextResponse.json(
      { error: "Current and new passwords are required" },
      { status: 400 },
    );
  }

  if (nextPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      {
        error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
      },
      { status: 400 },
    );
  }

  try {
    const result = await query<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE id = $1 LIMIT 1",
      [session.user.id],
    );

    const record = result.rows[0];

    if (!record?.password_hash) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const matches = await compare(currentPassword, record.password_hash);

    if (!matches) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
    }

    const passwordHash = await hash(nextPassword, 12);

    await query(
      `UPDATE users
          SET password_hash = $2,
              password_reset_code = NULL,
              password_reset_expires = NULL
        WHERE id = $1`,
      [session.user.id, passwordHash],
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update password:", error);
    return NextResponse.json(
      { error: "Could not update password" },
      { status: 500 },
    );
  }
}
