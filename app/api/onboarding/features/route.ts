import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, type DbBusinessRow } from "@/lib/db";

function normalizeFeatures(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const unique = new Set<string>();

  for (const entry of input) {
    if (typeof entry !== "string") {
      continue;
    }
    const trimmed = entry.trim();
    if (!trimmed) {
      continue;
    }
    unique.add(trimmed.slice(0, 100));
  }

  return Array.from(unique);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const features = normalizeFeatures((body as { features?: unknown }).features);

  if (features.length === 0) {
    return NextResponse.json(
      { error: "Please select at least one feature." },
      { status: 400 },
    );
  }

  const ownerId = session.user.id;

  const result = await query<DbBusinessRow>(
    `INSERT INTO businesses (owner_user_id, feature_preferences)
     VALUES ($1, $2)
     ON CONFLICT (owner_user_id) DO UPDATE SET
       feature_preferences = EXCLUDED.feature_preferences
     RETURNING feature_preferences`,
    [ownerId, features],
  );

  return NextResponse.json({
    success: true,
    featurePreferences: result.rows[0]?.feature_preferences ?? [],
  });
}
