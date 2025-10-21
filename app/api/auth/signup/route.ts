import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { query } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const companyName =
    typeof body.companyName === "string" ? body.companyName.trim() : "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  try {
    const existing = await query(
      "SELECT id FROM users WHERE email = $1 LIMIT 1",
      [email],
    );

    if (existing.rowCount && existing.rows.length > 0) {
      return NextResponse.json(
        { error: "An account with that email already exists" },
        { status: 409 },
      );
    }

    const passwordHash = await hash(password, 12);

    const verificationCode = randomBytes(32).toString("hex");

    await query(
      `INSERT INTO users (email, name, password_hash, company_name, email_code)
       VALUES ($1, $2, $3, $4, $5)`,
      [email, name || null, passwordHash, companyName || null, verificationCode],
    );

    try {
      await sendVerificationEmail({ recipient: email, code: verificationCode });
    } catch (sendError) {
      console.error("Sending verification email failed:", sendError);
    }

    return NextResponse.json({ success: true, email });
  } catch (error) {
    console.error("Sign up failed:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 },
    );
  }
}
