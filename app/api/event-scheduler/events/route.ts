import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrimaryBusinessForUser } from "@/lib/business";
import { createEvent, getEventsForBusiness } from "@/lib/events";
import type { EventStatus, EventType } from "@/types/events";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await getPrimaryBusinessForUser(session.user.id);

  if (!context) {
    return NextResponse.json(
      { error: "No business context found" },
      { status: 403 },
    );
  }

  const events = await getEventsForBusiness(context.business.id);

  return NextResponse.json({
    events,
    role: context.role,
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await getPrimaryBusinessForUser(session.user.id);

  if (!context) {
    return NextResponse.json(
      { error: "No business context found" },
      { status: 403 },
    );
  }

  if (context.role === "guest") {
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

  const title =
    typeof payload.title === "string" ? payload.title.trim() : "";
  const description =
    typeof payload.description === "string"
      ? payload.description.trim()
      : null;
  const coverImageUrl =
    typeof payload.coverImageUrl === "string"
      ? payload.coverImageUrl.trim()
      : null;
  const eventType: EventType =
    payload.eventType === "online" || payload.eventType === "hybrid"
      ? payload.eventType
      : "in_person";
  const locationAddress =
    typeof payload.locationAddress === "string"
      ? payload.locationAddress.trim()
      : null;
  const locationDetails =
    typeof payload.locationDetails === "string"
      ? payload.locationDetails.trim()
      : null;
  const virtualMeetingUrl =
    typeof payload.virtualMeetingUrl === "string"
      ? payload.virtualMeetingUrl.trim()
      : null;
  const timezone =
    typeof payload.timezone === "string"
      ? payload.timezone.trim() || "UTC"
      : "UTC";
  const startTime =
    typeof payload.startTime === "string" ? payload.startTime : null;
  const endTime =
    typeof payload.endTime === "string" ? payload.endTime : null;
  const registrationDeadline =
    typeof payload.registrationDeadline === "string"
      ? payload.registrationDeadline
      : null;
  const capacity =
    payload.capacity === null || payload.capacity === undefined
      ? null
      : payload.capacity;
  const status: EventStatus =
    payload.status === "published" ||
    payload.status === "completed" ||
    payload.status === "cancelled"
      ? payload.status
      : "draft";

  if (!title) {
    return NextResponse.json(
      { error: "Title is required" },
      { status: 400 },
    );
  }

  if (!startTime || !endTime) {
    return NextResponse.json(
      { error: "startTime and endTime are required" },
      { status: 400 },
    );
  }

  try {
    const event = await createEvent({
      businessId: context.business.id,
      createdByUserId: session.user.id,
      input: {
        title,
        description,
        coverImageUrl,
        eventType,
        locationAddress,
        locationDetails,
        virtualMeetingUrl,
        timezone,
        startTime,
        endTime,
        registrationDeadline,
        capacity: typeof capacity === "number" ? capacity : null,
        status: status as EventStatus,
      },
    });

    return NextResponse.json({ event });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
