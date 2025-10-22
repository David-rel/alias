import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export async function DELETE() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ownershipCheck = await query<{ id: string }>(
      "SELECT id FROM businesses WHERE owner_user_id = $1 LIMIT 1",
      [session.user.id],
    );

    if (ownershipCheck.rowCount && ownershipCheck.rows.length > 0) {
      return NextResponse.json(
        {
          error:
            "Delete your business workspace (or transfer ownership) before removing your account.",
        },
        { status: 409 },
      );
    }

    await query("DELETE FROM users WHERE id = $1", [session.user.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete account:", error);
    return NextResponse.json(
      { error: "Could not delete account" },
      { status: 500 },
    );
  }
}
