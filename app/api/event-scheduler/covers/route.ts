import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put, del } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { getPrimaryBusinessForUser } from "@/lib/business";

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

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const businessContext = await getPrimaryBusinessForUser(session.user.id);

  if (!businessContext) {
    return NextResponse.json(
      { error: "No business context" },
      { status: 403 },
    );
  }

  if (businessContext.role === "guest") {
    return NextResponse.json(
      { error: "Guests cannot upload event covers" },
      { status: 403 },
    );
  }

  const formData = await request.formData();
  const fileEntry = formData.get("cover");

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

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return NextResponse.json(
      { error: "File uploads are not configured" },
      { status: 500 },
    );
  }

  const buffer = Buffer.from(await fileEntry.arrayBuffer());
  const blobPath = `event-covers/${businessContext.business.id}/draft-${Date.now()}.${extension}`;

  try {
    const uploadResult = await put(blobPath, buffer, {
      access: "public",
      contentType: fileEntry.type || `image/${extension}`,
      token: blobToken,
    });

    return NextResponse.json({
      success: true,
      coverImageUrl: uploadResult.url,
    });
  } catch (error) {
    console.error("Failed to upload event cover", error);
    return NextResponse.json(
      { error: "Failed to upload event cover" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const businessContext = await getPrimaryBusinessForUser(session.user.id);

  if (!businessContext) {
    return NextResponse.json(
      { error: "No business context" },
      { status: 403 },
    );
  }

  if (businessContext.role === "guest") {
    return NextResponse.json(
      { error: "Guests cannot delete event covers" },
      { status: 403 },
    );
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return NextResponse.json(
      { error: "File uploads are not configured" },
      { status: 500 },
    );
  }

  const body = (await request.json()) as { url?: string | null } | null;
  const url = body?.url;

  if (!url) {
    return NextResponse.json(
      { error: "Missing cover URL to delete" },
      { status: 400 },
    );
  }

  try {
    await del(url, { token: blobToken });
  } catch (error) {
    console.error("Failed to delete draft event cover", error);
  }

  return NextResponse.json({ success: true });
}
