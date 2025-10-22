import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put, del } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { query, type QueryParam } from "@/lib/db";

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "svg"]);
const MIME_TO_EXTENSION = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/svg+xml", "svg"],
]);
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

function normalizeText(input: FormDataEntryValue | null, maxLength = 255) {
  if (typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function normalizePhone(input: FormDataEntryValue | null) {
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

function deriveExtension(file: File) {
  const fromMime = MIME_TO_EXTENSION.get(file.type.toLowerCase());
  if (fromMime) {
    return fromMime;
  }

  const name = (file as File & { name?: string }).name ?? "";
  const inferred = name.split(".").pop();
  if (!inferred) {
    return null;
  }
  const lower = inferred.toLowerCase();
  return ALLOWED_EXTENSIONS.has(lower) ? lower : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { memberId } = await params;

  // Check if the current user is an owner of the business
  const memberResult = await query(
    `SELECT m.business_id, b.owner_user_id
     FROM business_team_members m
     JOIN businesses b ON b.id = m.business_id
     WHERE m.id = $1
     LIMIT 1`,
    [memberId]
  );

  if (memberResult.rows.length === 0) {
    return NextResponse.json(
      { error: "Team member not found" },
      { status: 404 }
    );
  }

  const memberData = memberResult.rows[0];
  if (memberData.owner_user_id !== session.user.id) {
    return NextResponse.json(
      { error: "Only workspace owners can edit team member profiles" },
      { status: 403 }
    );
  }

  const formData = await request.formData();

  const name = normalizeText(formData.get("name"), 120);
  const email = normalizeText(formData.get("email"), 255);
  const phoneNumber = normalizePhone(formData.get("phoneNumber"));

  const updates: string[] = [];
  const values: QueryParam[] = [];
  let paramIndex = 1;

  if (name !== null) {
    updates.push(`name = $${paramIndex}`);
    values.push(name);
    paramIndex++;
  }

  if (email !== null) {
    updates.push(`email = $${paramIndex}`);
    values.push(email);
    paramIndex++;
  }

  if (phoneNumber !== null) {
    updates.push(`phone_number = $${paramIndex}`);
    values.push(phoneNumber);
    paramIndex++;
  }

  if (updates.length === 0) {
    return NextResponse.json(
      { error: "No profile fields to update" },
      { status: 400 }
    );
  }

  // Handle profile image upload
  const fileEntry = formData.get("file");
  let profileImageUrl = null;

  if (fileEntry instanceof File && fileEntry.size > 0) {
    if (fileEntry.size > MAX_LOGO_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Profile image must be smaller than 5MB." },
        { status: 400 }
      );
    }

    const extension = deriveExtension(fileEntry);

    if (!extension) {
      return NextResponse.json(
        {
          error:
            "Unsupported image format. Please upload PNG, JPG, JPEG, SVG, or WEBP.",
        },
        { status: 400 }
      );
    }

    if (!blobToken) {
      return NextResponse.json(
        { error: "BLOB_READ_WRITE_TOKEN is not configured." },
        { status: 500 }
      );
    }

    // Get current profile image URL to delete it
    const currentUserResult = await query<{ profile_image_url: string | null }>(
      `SELECT profile_image_url FROM users WHERE id = (
         SELECT user_id FROM business_team_members WHERE id = $1
       )`,
      [memberId]
    );

    const currentImageUrl = currentUserResult.rows[0]?.profile_image_url;

    const fileBuffer = Buffer.from(await fileEntry.arrayBuffer());
    const blobPath = `profile-images/${memberId}-${Date.now()}.${extension}`;

    const uploadResult = await put(blobPath, fileBuffer, {
      access: "public",
      contentType: fileEntry.type || `image/${extension}`,
      token: blobToken,
    });

    profileImageUrl = uploadResult.url;

    // Delete old profile image if it exists
    if (currentImageUrl) {
      try {
        await del(currentImageUrl, { token: blobToken });
      } catch (error) {
        console.error("Failed to delete previous profile image:", error);
      }
    }

    updates.push(`profile_image_url = $${paramIndex}`);
    values.push(profileImageUrl);
    paramIndex++;
  }

  // Get the user_id for the team member
  const userResult = await query<{ user_id: string }>(
    `SELECT user_id FROM business_team_members WHERE id = $1`,
    [memberId]
  );

  if (userResult.rows.length === 0) {
    return NextResponse.json(
      { error: "Team member not found" },
      { status: 404 }
    );
  }

  const userId = userResult.rows[0].user_id;

  try {
    const result = await query<{
      name: string | null;
      email: string;
      phone_number: string | null;
      profile_image_url: string | null;
    }>(
      `UPDATE users
       SET ${updates.join(", ")}
       WHERE id = $${paramIndex}
       RETURNING name, email, phone_number, profile_image_url`,
      [...values, userId]
    );

    const user = result.rows[0];

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      profile: {
        name: user.name,
        email: user.email,
        phoneNumber: user.phone_number,
        profileImageUrl: user.profile_image_url,
      },
    });
  } catch (error) {
    console.error("Failed to update team member profile:", error);
    return NextResponse.json(
      { error: "Could not update profile" },
      { status: 500 }
    );
  }
}
