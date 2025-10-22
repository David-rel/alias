import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, type DbUserPreferencesRow } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await query<DbUserPreferencesRow>(
      `SELECT preferences FROM user_preferences WHERE user_id = $1`,
      [session.user.id]
    );

    if (result.rows.length === 0) {
      // Return default preferences if none exist
      return NextResponse.json({
        theme: "dark",
        language: "en",
        notifications: {
          sms: false,
          email: true,
          push: false,
        },
        marketing: {
          email_opt_in: false,
          organization_announcements: true,
        },
        accessibility: {
          high_contrast: false,
          reduced_motion: false,
          large_text: false,
          screen_reader_optimized: false,
        },
      });
    }

    return NextResponse.json(result.rows[0].preferences);
  } catch (error) {
    console.error("Failed to fetch user preferences:", error);
    return NextResponse.json(
      { error: "Could not fetch preferences" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const updates = await request.json();

    // Validate the updates structure
    const allowedFields = [
      "theme",
      "language",
      "notifications",
      "marketing",
      "accessibility",
    ];

    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = value;
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json(
        { error: "No valid preferences to update" },
        { status: 400 }
      );
    }

    // Get current preferences
    const currentResult = await query<DbUserPreferencesRow>(
      `SELECT preferences FROM user_preferences WHERE user_id = $1`,
      [session.user.id]
    );

    let newPreferences: Record<string, unknown>;

    if (currentResult.rows.length === 0) {
      // Create new preferences with defaults
      newPreferences = {
        theme: "dark",
        language: "en",
        notifications: {
          sms: false,
          email: true,
          push: false,
        },
        marketing: {
          email_opt_in: false,
          organization_announcements: true,
        },
        accessibility: {
          high_contrast: false,
          reduced_motion: false,
          large_text: false,
          screen_reader_optimized: false,
        },
        ...filteredUpdates,
      };
    } else {
      // Merge with existing preferences
      newPreferences = {
        ...currentResult.rows[0].preferences,
        ...filteredUpdates,
      };
    }

    // Upsert the preferences
    await query(
      `INSERT INTO user_preferences (user_id, preferences)
       VALUES ($1, $2)
       ON CONFLICT (user_id)
       DO UPDATE SET preferences = $2, updated_at = NOW()`,
      [session.user.id, JSON.stringify(newPreferences)]
    );

    return NextResponse.json({ success: true, preferences: newPreferences });
  } catch (error) {
    console.error("Failed to update user preferences:", error);
    return NextResponse.json(
      { error: "Could not update preferences" },
      { status: 500 }
    );
  }
}
