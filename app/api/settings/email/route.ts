import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const rawEmail = (payload as Record<string, unknown>).email;

  if (typeof rawEmail !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const email = rawEmail.trim().toLowerCase();

  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  try {
    const currentResult = await query<{ email: string }>(
      "SELECT email FROM users WHERE id = $1 LIMIT 1",
      [session.user.id],
    );

    const currentEmail = currentResult.rows[0]?.email ?? null;

    if (!currentEmail) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (currentEmail.toLowerCase() === email) {
      return NextResponse.json(
        { error: "That’s already your email address." },
        { status: 400 },
      );
    }

    const duplicateCheck = await query<{ id: string }>(
      "SELECT id FROM users WHERE LOWER(email) = $1 AND id <> $2 LIMIT 1",
      [email, session.user.id],
    );

    if (duplicateCheck.rowCount && duplicateCheck.rows.length > 0) {
      return NextResponse.json(
        { error: "Another account already uses that email." },
        { status: 409 },
      );
    }

    const verificationCode = randomBytes(32).toString("hex");

    await query(
      `UPDATE users
          SET email = $2,
              email_verified = FALSE,
              email_code = $3
        WHERE id = $1`,
      [session.user.id, email, verificationCode],
    );

    await sendVerificationEmail({ recipient: email, code: verificationCode });

    return NextResponse.json({
      success: true,
      email,
    });
  } catch (error) {
    console.error("Failed to update email:", error);
    return NextResponse.json(
      { error: "Could not update email address" },
      { status: 500 },
    );
  }
}
