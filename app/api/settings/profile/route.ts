import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, type QueryParam } from "@/lib/db";

const hasSupportedTimeZones =
  typeof Intl.supportedValuesOf === "function" &&
  Array.isArray(Intl.supportedValuesOf("timeZone"));

const supportedTimeZones = hasSupportedTimeZones
  ? new Set(Intl.supportedValuesOf("timeZone"))
  : null;

function normalizeNullable(input: unknown, maxLength = 255) {
  if (typeof input !== "string") {
    return null;
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.slice(0, maxLength);
}

function normalizePhone(input: unknown) {
  if (typeof input !== "string") {
    return null;
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  const cleaned = trimmed.replace(/[^\d+().\- ]+/g, "");
  const compact = cleaned.replace(/\s+/g, " ").trim();
  if (!compact) {
    return null;
  }
  return compact.slice(0, 32);
}

function normalizeTimezone(input: unknown) {
  if (typeof input !== "string") {
    return null;
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  const upperZone = trimmed.slice(0, 64);
  if (supportedTimeZones && !supportedTimeZones.has(upperZone)) {
    return null;
  }
  return upperZone;
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);

  if (!payload || typeof payload !== "object") {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const data = payload as Record<string, unknown>;

  const updates: string[] = [];
  const values: QueryParam[] = [session.user.id];
  let paramIndex = 2;

  if (Object.hasOwn(data, "name")) {
    updates.push(`name = $${paramIndex}`);
    values.push(normalizeNullable(data.name, 120));
    paramIndex += 1;
  }

  if (Object.hasOwn(data, "phoneNumber")) {
    updates.push(`phone_number = $${paramIndex}`);
    values.push(normalizePhone(data.phoneNumber));
    paramIndex += 1;
  }

  if (Object.hasOwn(data, "timezone")) {
    updates.push(`timezone = $${paramIndex}`);
    values.push(normalizeTimezone(data.timezone));
    paramIndex += 1;
  }

  if (Object.hasOwn(data, "location")) {
    updates.push(`location = $${paramIndex}`);
    values.push(normalizeNullable(data.location, 120));
    paramIndex += 1;
  }

  if (updates.length === 0) {
    return NextResponse.json(
      { error: "No profile fields provided" },
      { status: 400 }
    );
  }

  try {
    const result = await query<{
      name: string | null;
      phone_number: string | null;
      timezone: string | null;
      location: string | null;
    }>(
      `UPDATE users
          SET ${updates.join(", ")}
        WHERE id = $1
        RETURNING name, phone_number, timezone, location`,
      values
    );

    const user = result.rows[0];

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      profile: {
        name: user.name,
        phoneNumber: user.phone_number,
        timezone: user.timezone,
        location: user.location,
      },
    });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json(
      { error: "Could not update profile" },
      { status: 500 }
    );
  }
}
