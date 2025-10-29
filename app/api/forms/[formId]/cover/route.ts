import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put, del } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { getPrimaryBusinessForUser } from "@/lib/business";
import { getFormForBusiness } from "@/lib/forms";
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
    formId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { formId } = await context.params;
  const businessContext = await getPrimaryBusinessForUser(session.user.id);

  if (!businessContext) {
    return NextResponse.json(
      { error: "No business found for user" },
      { status: 403 },
    );
  }

  if (businessContext.role === "guest") {
    return NextResponse.json(
      { error: "Insufficient permissions to update form cover" },
      { status: 403 },
    );
  }

  const form = await getFormForBusiness(formId, businessContext.business.id);

  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
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
    if (form.cover_image_url) {
      try {
        await del(form.cover_image_url, { token: blobToken });
      } catch (error) {
        console.error("Failed to delete existing cover image:", error);
      }
    }

    await query(
      `UPDATE forms
          SET cover_image_url = NULL,
              updated_at = NOW()
        WHERE id = $1
          AND business_id = $2`,
      [formId, businessContext.business.id],
    );

    return NextResponse.json({
      success: true,
      coverImageUrl: null,
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
  const blobPath = `form-covers/${formId}-${Date.now()}.${extension}`;

  try {
    const uploadResult = await put(blobPath, buffer, {
      access: "public",
      contentType: fileEntry.type || `image/${extension}`,
      token: blobToken,
    });

    if (form.cover_image_url && form.cover_image_url !== uploadResult.url) {
      try {
        await del(form.cover_image_url, { token: blobToken });
      } catch (error) {
        console.error("Failed to delete previous cover image:", error);
      }
    }

    const updateResult = await query<{ cover_image_url: string | null }>(
      `UPDATE forms
          SET cover_image_url = $3,
              updated_at = NOW()
        WHERE id = $1
          AND business_id = $2
        RETURNING cover_image_url`,
      [formId, businessContext.business.id, uploadResult.url],
    );

    return NextResponse.json({
      success: true,
      coverImageUrl: updateResult.rows[0]?.cover_image_url ?? uploadResult.url,
    });
  } catch (error) {
    console.error("Failed to upload cover image:", error);
    return NextResponse.json(
      { error: "Failed to upload cover image" },
      { status: 500 },
    );
  }
}
