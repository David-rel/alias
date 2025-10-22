import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put, del } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "svg"]);
const MIME_TO_EXTENSION = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/svg+xml", "svg"],
]);

const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

function normalizeRemoveFlag(value: FormDataEntryValue | null) {
  return String(value ?? "false").toLowerCase() === "true";
}

function deriveExtension(file: File) {
  const mime = file.type.toLowerCase();
  if (MIME_TO_EXTENSION.has(mime)) {
    return MIME_TO_EXTENSION.get(mime) ?? null;
  }

  const fileName = (file as File & { name?: string }).name ?? "";
  const inferred = fileName.split(".").pop();
  if (!inferred) {
    return null;
  }
  const lower = inferred.toLowerCase();
  return ALLOWED_EXTENSIONS.has(lower) ? lower : null;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!blobToken) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN is not configured" },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const remove = normalizeRemoveFlag(formData.get("remove"));
  const fileEntry = formData.get("file");

  try {
    const userResult = await query<{ profile_image_url: string | null }>(
      "SELECT profile_image_url FROM users WHERE id = $1 LIMIT 1",
      [session.user.id],
    );

    const currentImage = userResult.rows[0]?.profile_image_url ?? null;
    let nextImage = currentImage;

    if (remove && currentImage) {
      try {
        await del(currentImage, { token: blobToken });
      } catch (error) {
        console.error("Failed to delete profile image from blob storage:", error);
      }
      nextImage = null;
    }

    if (fileEntry instanceof File && fileEntry.size > 0) {
      if (fileEntry.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: "Profile photos must be smaller than 5MB." },
          { status: 400 },
        );
      }

      const extension = deriveExtension(fileEntry);
      if (!extension) {
        return NextResponse.json(
          {
            error:
              "Unsupported image format. Upload PNG, JPG, JPEG, SVG, or WEBP files.",
          },
          { status: 400 },
        );
      }

      const fileBuffer = Buffer.from(await fileEntry.arrayBuffer());
      const blobPath = `user-avatars/${session.user.id}-${Date.now()}.${extension}`;

      const uploadResult = await put(blobPath, fileBuffer, {
        access: "public",
        contentType: fileEntry.type || `image/${extension}`,
        token: blobToken,
      });

      if (currentImage && currentImage !== uploadResult.url) {
        try {
          await del(currentImage, { token: blobToken });
        } catch (error) {
          console.error(
            "Failed to delete previous profile image from blob storage:",
            error,
          );
        }
      }

      nextImage = uploadResult.url;
    }

    const result = await query<{ profile_image_url: string | null }>(
      `UPDATE users
          SET profile_image_url = $2
        WHERE id = $1
        RETURNING profile_image_url`,
      [session.user.id, nextImage],
    );

    return NextResponse.json({
      success: true,
      profileImageUrl: result.rows[0]?.profile_image_url ?? null,
    });
  } catch (error) {
    console.error("Failed to update profile image:", error);
    return NextResponse.json(
      { error: "Could not update profile image" },
      { status: 500 },
    );
  }
}
