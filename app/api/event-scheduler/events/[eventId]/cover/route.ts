import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put, del } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { getPrimaryBusinessForUser } from "@/lib/business";
import { getEvent } from "@/lib/events";
import { query } from "@/lib/db";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_PREFIXES = ["image/"];

function deriveExtension(file: File): string | null {
  const name = file.name ?? "";
  const match = name.match(/\.([a-zA-Z0-9]+)$/);
  if (match) {
    return match[1]?.toLowerCase() ?? null;
  }
  const type = file.type ?? "";
  if (type.startsWith("image/")) {
    return type.split("/")[1] ?? null;
  }
  return null;
}

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

export async function POST(request: Request, routeContext: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await routeContext.params;
  const businessContext = await getPrimaryBusinessForUser(session.user.id);

  if (!businessContext) {
    return NextResponse.json(
      { error: "No business found for user" },
      { status: 403 },
    );
  }

  if (businessContext.role === "guest") {
    return NextResponse.json(
      { error: "Insufficient permissions to update event cover" },
      { status: 403 },
    );
  }

  const event = await getEvent(eventId, businessContext.business.id);

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return NextResponse.json(
      { error: "File uploads are not configured" },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const action = formData.get("action");
  const fileEntry = formData.get("cover");

  if (action === "remove") {
    if (event.coverImageUrl) {
      try {
        await del(event.coverImageUrl, { token: blobToken });
      } catch (error) {
        console.error("Failed to delete existing event cover image:", error);
      }
    }

    const updateResult = await query<{ cover_image_url: string | null }>(
      `UPDATE events
          SET cover_image_url = NULL,
              updated_at = NOW()
        WHERE id = $1
          AND business_id = $2
        RETURNING cover_image_url`,
      [eventId, businessContext.business.id],
    );

    return NextResponse.json({
      success: true,
      coverImageUrl: updateResult.rows[0]?.cover_image_url ?? null,
    });
  }

  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return NextResponse.json(
      { error: "No cover image provided" },
      { status: 400 },
    );
  }

  if (fileEntry.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Cover image must be 10MB or smaller" },
      { status: 400 },
    );
  }

  if (
    fileEntry.type &&
    !ALLOWED_MIME_PREFIXES.some((prefix) => fileEntry.type.startsWith(prefix))
  ) {
    return NextResponse.json(
      { error: "Only image uploads are supported" },
      { status: 400 },
    );
  }

  const extension = deriveExtension(fileEntry);

  if (!extension) {
    return NextResponse.json(
      { error: "Unsupported file type" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await fileEntry.arrayBuffer());
  const blobPath = `event-covers/${eventId}-${Date.now()}.${extension}`;

  try {
    const uploadResult = await put(blobPath, buffer, {
      access: "public",
      contentType: fileEntry.type || `image/${extension}`,
      token: blobToken,
    });

    if (event.coverImageUrl && event.coverImageUrl !== uploadResult.url) {
      try {
        await del(event.coverImageUrl, { token: blobToken });
      } catch (error) {
        console.error("Failed to delete previous event cover image:", error);
      }
    }

    const updateResult = await query<{ cover_image_url: string | null }>(
      `UPDATE events
          SET cover_image_url = $3,
              updated_at = NOW()
        WHERE id = $1
          AND business_id = $2
        RETURNING cover_image_url`,
      [eventId, businessContext.business.id, uploadResult.url],
    );

    return NextResponse.json({
      success: true,
      coverImageUrl: updateResult.rows[0]?.cover_image_url ?? uploadResult.url,
    });
  } catch (error) {
    console.error("Failed to upload event cover image:", error);
    return NextResponse.json(
      { error: "Failed to upload cover image" },
      { status: 500 },
    );
  }
}
