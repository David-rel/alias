import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { loggedIn } = body;

    if (typeof loggedIn !== "boolean") {
      return NextResponse.json(
        { error: "loggedIn must be a boolean" },
        { status: 400 }
      );
    }

    // Set the appropriate timestamp based on login status
    const now = new Date().toISOString();
    const updates: string[] = ["logged_in_status = $1"];
    const values: (boolean | string | null)[] = [loggedIn];

    if (loggedIn) {
      // User is logging in - set last_online_at and clear last_offline_at
      updates.push("last_online_at = $2", "last_offline_at = NULL");
      values.push(now);
    } else {
      // User is logging out - set last_offline_at
      updates.push("last_offline_at = $2");
      values.push(now);
    }

    await query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${values.length + 1}`,
      [...values, session.user.id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update login status:", error);
    return NextResponse.json(
      { error: "Could not update login status" },
      { status: 500 }
    );
  }
}
