import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put, del } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { query, type DbBusinessRow } from "@/lib/db";
import { getTeamAccess, type TeamAccess } from "@/lib/team";
import {
  DEFAULT_BUSINESS_INTEGRATIONS,
  getBusinessIntegrations,
  getBusinessPlan,
} from "@/lib/business";

const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

const ALLOWED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "svg"]);
const MIME_TO_EXTENSION = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/svg+xml", "svg"],
]);

function normalize(input: FormDataEntryValue | null, maxLength = 255) {
  if (typeof input !== "string") {
    return null;
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.slice(0, maxLength);
}

function normalizeCheckbox(input: FormDataEntryValue | null) {
  return String(input ?? "false").toLowerCase() === "true";
}

function deriveExtension(file: File) {
  const mime = file.type.toLowerCase();
  if (MIME_TO_EXTENSION.has(mime)) {
    return MIME_TO_EXTENSION.get(mime) ?? null;
  }
  const rawName = (file as File & { name?: string }).name ?? "";
  const inferred = rawName.split(".").pop();
  if (!inferred) {
    return null;
  }
  const lower = inferred.toLowerCase();
  return ALLOWED_EXTENSIONS.has(lower) ? lower : null;
}

async function ensureBusiness(sessionUserId: string) {
  const result = await query<DbBusinessRow>(
    "SELECT * FROM businesses WHERE owner_user_id = $1 LIMIT 1",
    [sessionUserId],
  );
  return result.rows[0] ?? null;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await getTeamAccess(session.user.id);

  const business = access?.business ?? null;

  if (!business) {
    return NextResponse.json(
      { error: "Business workspace not found" },
      { status: 404 },
    );
  }

  const plan = await getBusinessPlan(business.id);
  const integrations = await getBusinessIntegrations(business.id);
  const labelMap = new Map(
    DEFAULT_BUSINESS_INTEGRATIONS.map((item) => [item.key, item.label]),
  );

  return NextResponse.json({
    role: access?.viewerRole ?? "guest",
    business: {
      id: business.id,
      name: business.name,
      businessCategory: business.business_category,
      industry: business.industry,
      description: business.description,
      logoPath: business.logo_path,
      companySize: business.company_size,
      location: business.location,
    },
    plan: plan
      ? {
          planId: plan.plan_id,
          planName: plan.plan_name,
          status: plan.status,
          paymentProvider: plan.payment_provider,
          currentPeriodEnd: plan.current_period_end
            ? plan.current_period_end.toISOString()
            : null,
        }
      : null,
    integrations: integrations.map((integration) => ({
      id: integration.id,
      key: integration.integration_key,
      label: labelMap.get(integration.integration_key) ?? integration.integration_key,
      status: integration.status,
      settings: integration.settings,
      updatedAt: integration.updated_at.toISOString(),
    })),
  });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let access: TeamAccess | null = await getTeamAccess(session.user.id);

  if (!access?.business) {
    // Attempt to locate a business if the user is the owner but getTeamAccess returned null.
    const ownedBusiness = await ensureBusiness(session.user.id);
    if (!ownedBusiness) {
      return NextResponse.json(
        { error: "Business workspace not found" },
        { status: 404 },
      );
    }
    access = {
      business: ownedBusiness,
      viewerRole: "owner",
      membership: null,
    };
  }

  if (access.viewerRole === "guest") {
    return NextResponse.json(
      { error: "You do not have permission to update business settings." },
      { status: 403 },
    );
  }

  if (!blobToken) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN is not configured." },
      { status: 500 },
    );
  }

  const formData = await request.formData();

  const businessName = normalize(formData.get("businessName"), 150);
  const businessCategory = normalize(formData.get("businessCategory"));
  const industry = normalize(formData.get("industry"));
  const description = normalize(formData.get("description"), 500);
  const companySize = normalize(formData.get("companySize"));
  const location = normalize(formData.get("location"));
  const removeLogo = normalizeCheckbox(formData.get("removeLogo"));
  const logoEntry = formData.get("logo");

  const business = access.business;
  let nextLogoPath = business.logo_path ?? null;

  try {
    if (removeLogo && nextLogoPath) {
      try {
        await del(nextLogoPath, { token: blobToken });
      } catch (error) {
        console.error("Failed to delete existing business logo:", error);
      }
      nextLogoPath = null;
    }

    if (logoEntry instanceof File && logoEntry.size > 0) {
      if (logoEntry.size > 5 * 1024 * 1024) {
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
      const blobPath = `business-logos/${business.id}-${Date.now()}.${extension}`;

      const uploadResult = await put(blobPath, fileBuffer, {
        access: "public",
        contentType: logoEntry.type || `image/${extension}`,
        token: blobToken,
      });

      if (nextLogoPath && nextLogoPath !== uploadResult.url) {
        try {
          await del(nextLogoPath, { token: blobToken });
        } catch (error) {
          console.error("Failed to delete previous business logo:", error);
        }
      }

      nextLogoPath = uploadResult.url;
    }

    const result = await query<DbBusinessRow>(
      `UPDATE businesses
          SET name = $2,
              business_category = $3,
              industry = $4,
              description = $5,
              logo_path = $6,
              company_size = $7,
              location = $8
        WHERE id = $1
        RETURNING *`,
      [
        business.id,
        businessName,
        businessCategory,
        industry,
        description,
        nextLogoPath,
        companySize,
        location,
      ],
    );

    const updated = result.rows[0];

    return NextResponse.json({
      success: true,
      business: {
        id: updated.id,
        name: updated.name,
        businessCategory: updated.business_category,
        industry: updated.industry,
        description: updated.description,
        logoPath: updated.logo_path,
        companySize: updated.company_size,
        location: updated.location,
      },
    });
  } catch (error) {
    console.error("Failed to update business:", error);
    return NextResponse.json(
      { error: "Could not update business settings" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await getTeamAccess(session.user.id);

  if (!access?.business) {
    return NextResponse.json(
      { error: "Business workspace not found" },
      { status: 404 },
    );
  }

  if (access.viewerRole !== "owner") {
    return NextResponse.json(
      { error: "Only the owner can delete this workspace." },
      { status: 403 },
    );
  }

  const business = access.business;

  try {
    if (blobToken && business.logo_path) {
      try {
        await del(business.logo_path, { token: blobToken });
      } catch (error) {
        console.error(
          "Failed to delete business logo during workspace removal:",
          error,
        );
      }
    }

    await query("DELETE FROM businesses WHERE id = $1", [business.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete business:", error);
    return NextResponse.json(
      { error: "Could not delete business workspace" },
      { status: 500 },
    );
  }
}
