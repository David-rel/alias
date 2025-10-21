import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { query } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!code || !password) {
    return NextResponse.json(
      { error: "Reset code and password are required" },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  try {
    const result = await query<{ id: string }>(
      `SELECT id
         FROM users
        WHERE password_reset_code = $1
          AND (password_reset_expires IS NULL OR password_reset_expires > NOW())
        LIMIT 1`,
      [code],
    );

    const user = result.rows[0];

    if (!user) {
      return NextResponse.json(
        { error: "Reset code is invalid or expired" },
        { status: 400 },
      );
    }

    const passwordHash = await hash(password, 12);

    await query(
      `UPDATE users
          SET password_hash = $1,
              password_reset_code = NULL,
              password_reset_expires = NULL,
              email_verified = TRUE,
              updated_at = NOW()
        WHERE id = $2`,
      [passwordHash, user.id],
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Password reset failed:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 },
    );
  }
}
