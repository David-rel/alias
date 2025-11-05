import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrimaryBusinessForUser } from "@/lib/business";
import {
  deleteEvent,
  getEventWithStats,
  getRegistrationsForEvent,
  updateEvent,
} from "@/lib/events";
import type { UpdateEventInput } from "@/types/events";

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { eventId } = await context.params;
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

  const event = await getEventWithStats(eventId, businessContext.business.id);

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const registrations = await getRegistrationsForEvent(
    event.id,
    businessContext.business.id,
  );

  return NextResponse.json({
    event,
    registrations,
    role: businessContext.role,
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { eventId } = await context.params;
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

  const updates: UpdateEventInput = {};

  if ("title" in payload) {
    updates.title =
      typeof payload.title === "string" ? payload.title : undefined;
  }

  if ("description" in payload) {
    updates.description =
      typeof payload.description === "string"
        ? payload.description
        : payload.description === null
          ? null
          : undefined;
  }

  if ("coverImageUrl" in payload) {
    updates.coverImageUrl =
      typeof payload.coverImageUrl === "string"
        ? payload.coverImageUrl
        : payload.coverImageUrl === null
          ? null
          : undefined;
  }

  if ("eventType" in payload) {
    updates.eventType =
      typeof payload.eventType === "string"
        ? (payload.eventType as UpdateEventInput["eventType"])
        : undefined;
  }

  if ("locationAddress" in payload) {
    updates.locationAddress =
      typeof payload.locationAddress === "string"
        ? payload.locationAddress
        : payload.locationAddress === null
          ? null
          : undefined;
  }

  if ("locationDetails" in payload) {
    updates.locationDetails =
      typeof payload.locationDetails === "string"
        ? payload.locationDetails
        : payload.locationDetails === null
          ? null
          : undefined;
  }

  if ("virtualMeetingUrl" in payload) {
    updates.virtualMeetingUrl =
      typeof payload.virtualMeetingUrl === "string"
        ? payload.virtualMeetingUrl
        : payload.virtualMeetingUrl === null
          ? null
          : undefined;
  }

  if ("timezone" in payload) {
    updates.timezone =
      typeof payload.timezone === "string" ? payload.timezone : undefined;
  }

  if ("startTime" in payload) {
    updates.startTime =
      typeof payload.startTime === "string" ? payload.startTime : undefined;
  }

  if ("endTime" in payload) {
    updates.endTime =
      typeof payload.endTime === "string" ? payload.endTime : undefined;
  }

  if ("registrationDeadline" in payload) {
    updates.registrationDeadline =
      typeof payload.registrationDeadline === "string"
        ? payload.registrationDeadline
        : payload.registrationDeadline === null
          ? null
          : undefined;
  }

  if ("capacity" in payload) {
    updates.capacity =
      payload.capacity === null || payload.capacity === undefined
        ? null
        : (typeof payload.capacity === "number"
          ? payload.capacity
          : payload.capacity === null
            ? null
            : parseInt(payload.capacity as string));
  }

  if ("status" in payload) {
    updates.status =
      typeof payload.status === "string"
        ? (payload.status as UpdateEventInput["status"])
        : undefined;
  }

  try {
    const event = await updateEvent(
      eventId,
      businessContext.business.id,
      updates,
    );

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { eventId } = await context.params;
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

  await deleteEvent(eventId, businessContext.business.id);

  return NextResponse.json({ ok: true });
}
