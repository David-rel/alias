import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put, del } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { query, type DbBusinessRow } from "@/lib/db";

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

async function ensureBusiness(ownerId: string) {
  const existing = await query<DbBusinessRow>(
    "SELECT * FROM businesses WHERE owner_user_id = $1 LIMIT 1",
    [ownerId],
  );

  return existing.rows[0] ?? null;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerId = session.user.id;
  const formData = await request.formData();

  const businessCategory = normalizeText(formData.get("businessCategory"));
  const industry = normalizeText(formData.get("industry"));
  const description = normalizeText(formData.get("description"), 500);
  const companySize = normalizeText(formData.get("companySize"));
  const location = normalizeText(formData.get("location"));
  const logoEntry = formData.get("logo");
  const removeLogo = String(formData.get("removeLogo") ?? "false") === "true";

  const requiredFields: Record<string, string | null> = {
    businessCategory,
    industry,
    description,
    companySize,
    location,
  };

  const missingFields = Object.entries(requiredFields)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingFields.length > 0) {
    return NextResponse.json(
      { error: `Missing required fields: ${missingFields.join(", ")}` },
      { status: 400 },
    );
  }

  const existingBusiness = await ensureBusiness(ownerId);
  let nextLogoPath = existingBusiness?.logo_path ?? null;

  if (!blobToken) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN is not configured." },
      { status: 500 },
    );
  }

  if (logoEntry instanceof File && logoEntry.size > 0) {
    if (logoEntry.size > MAX_LOGO_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Logo file must be smaller than 5MB." },
        { status: 400 },
      );
    }

    const extension = deriveExtension(logoEntry);

    if (!extension) {
      return NextResponse.json(
        {
          error:
            "Unsupported logo format. Please upload PNG, JPG, JPEG, SVG, or WEBP.",
        },
        { status: 400 },
      );
    }

    const fileBuffer = Buffer.from(await logoEntry.arrayBuffer());
    const blobPath = `business-logos/${ownerId}-${Date.now()}.${extension}`;

    const uploadResult = await put(blobPath, fileBuffer, {
      access: "public",
      contentType: logoEntry.type || `image/${extension}`,
      token: blobToken,
    });

    if (existingBusiness?.logo_path) {
      try {
        await del(existingBusiness.logo_path, {
          token: blobToken,
        });
      } catch (error) {
        console.error("Failed to delete previous logo from blob storage:", error);
      }
    }

    nextLogoPath = uploadResult.url;
  } else if (removeLogo && existingBusiness?.logo_path) {
    try {
      await del(existingBusiness.logo_path, {
        token: blobToken,
      });
    } catch (error) {
      console.error("Failed to delete logo from blob storage:", error);
    }
    nextLogoPath = null;
  }

  const upsertResult = await query<DbBusinessRow>(
    `INSERT INTO businesses (
       owner_user_id,
       business_category,
       industry,
       description,
       logo_path,
       company_size,
       location
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (owner_user_id) DO UPDATE SET
       business_category = EXCLUDED.business_category,
       industry = EXCLUDED.industry,
       description = EXCLUDED.description,
       logo_path = EXCLUDED.logo_path,
       company_size = EXCLUDED.company_size,
       location = EXCLUDED.location
     RETURNING *`,
    [
      ownerId,
      businessCategory,
      industry,
      description,
      nextLogoPath,
      companySize,
      location,
    ],
  );

  const business = upsertResult.rows[0];

  return NextResponse.json({
    success: true,
    business: {
      id: business.id,
      businessCategory: business.business_category,
      industry: business.industry,
      description: business.description,
      logoPath: business.logo_path,
      companySize: business.company_size,
      location: business.location,
      featurePreferences: business.feature_preferences,
    },
  });
}
