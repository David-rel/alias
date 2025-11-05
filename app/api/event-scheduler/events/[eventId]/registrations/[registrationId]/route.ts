import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrimaryBusinessForUser } from "@/lib/business";
import { toggleEventRegistrationCheckIn } from "@/lib/events";

type RouteContext = {
  params: Promise<{
    eventId: string;
    registrationId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { eventId, registrationId } = await context.params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const businessContext = await getPrimaryBusinessForUser(session.user.id);

  if (!businessContext) {
    return NextResponse.json(
      { error: "No business context found" },
      { status: 403 },
    );
  }

  if (businessContext.role === "guest") {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 },
    );
  }

  let payload: Record<string, unknown>;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const checkedIn =
    typeof payload.checkedIn === "boolean" ? payload.checkedIn : null;

  if (checkedIn === null) {
    return NextResponse.json(
      { error: "checkedIn boolean is required" },
      { status: 400 },
    );
  }

  const registration = await toggleEventRegistrationCheckIn({
    eventId,
    registrationId,
    businessId: businessContext.business.id,
    checkedIn,
  });

  if (!registration) {
    return NextResponse.json(
      { error: "Registration not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ registration });
}
