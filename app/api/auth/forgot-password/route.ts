import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { query } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email) {
    return NextResponse.json(
      { error: "Email is required" },
      { status: 400 },
    );
  }

  try {
    const result = await query<{ id: string; email_verified: boolean }>(
      "SELECT id, email_verified FROM users WHERE email = $1 LIMIT 1",
      [email],
    );

    const user = result.rows[0];

    if (user) {
      const resetCode = randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000);

      await query(
        `UPDATE users
         SET password_reset_code = $1,
             password_reset_expires = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [resetCode, expires, user.id],
      );

      if (user.email_verified) {
        try {
          await sendPasswordResetEmail({
            recipient: email,
            code: resetCode,
          });
        } catch (sendError) {
          console.error("Failed to send password reset email:", sendError);
        }
      }
    }

    // Always respond with success to avoid account enumeration.
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forgot password failed:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 },
    );
  }
}
