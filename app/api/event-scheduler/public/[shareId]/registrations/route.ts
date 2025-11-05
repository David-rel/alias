import { NextResponse } from "next/server";
import { getEventByShareId, registerAttendeeViaShareId } from "@/lib/events";
import { query } from "@/lib/db";
import {
  sendEventRegistrationConfirmationEmail,
  sendEventRegistrationNotificationEmail,
} from "@/lib/email";

type RouteContext = {
  params: Promise<{
    shareId: string;
  }>;
};

function summarizeEventLocation(event: {
  eventType: "in_person" | "online" | "hybrid";
  locationAddress: string | null;
  locationDetails: string | null;
  virtualMeetingUrl: string | null;
}) {
  switch (event.eventType) {
    case "in_person": {
      if (event.locationAddress && event.locationDetails) {
        return `${event.locationAddress} · ${event.locationDetails}`;
      }
      return event.locationAddress ?? event.locationDetails ?? "In-person event";
    }
    case "online": {
      if (event.virtualMeetingUrl) {
        return `Online event · ${event.virtualMeetingUrl}`;
      }
      return event.locationDetails ?? "Online event";
    }
    default: {
      const parts: string[] = [];
      if (event.locationAddress) {
        parts.push(event.locationAddress);
      }
      if (event.virtualMeetingUrl) {
        parts.push(`Online: ${event.virtualMeetingUrl}`);
      }
      if (event.locationDetails) {
        parts.push(event.locationDetails);
      }
      return parts.join(" · ") || "Hybrid event";
    }
  }
}

export async function GET(_: Request, context: RouteContext) {
  const { shareId } = await context.params;
  const event = await getEventByShareId(shareId, { withStats: true });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({ event });
}

export async function POST(request: Request, context: RouteContext) {
  const { shareId } = await context.params;

  let payload: Record<string, unknown>;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const attendeeName =
    typeof payload.attendeeName === "string"
      ? payload.attendeeName.trim()
      : "";
  const attendeeEmail =
    typeof payload.attendeeEmail === "string"
      ? payload.attendeeEmail.trim()
      : "";
  const attendeePhone =
    typeof payload.attendeePhone === "string"
      ? payload.attendeePhone.trim()
      : null;
  const notes =
    typeof payload.notes === "string" ? payload.notes.trim() : null;

  if (!attendeeName || !attendeeEmail) {
    return NextResponse.json(
      { error: "Name and email are required" },
      { status: 400 },
    );
  }

  try {
    const { event, registration } = await registerAttendeeViaShareId(
      shareId,
      {
        attendeeName,
        attendeeEmail,
        attendeePhone,
        notes,
      },
    );

    const [businessResult, ownerResult] = await Promise.all([
      query<{ name: string | null }>(
        `SELECT name
           FROM businesses
          WHERE id = $1
          LIMIT 1`,
        [event.businessId],
      ),
      event.createdByUserId
        ? query<{ email: string | null; name: string | null }>(
            `SELECT email, name
               FROM users
              WHERE id = $1
              LIMIT 1`,
            [event.createdByUserId],
          )
        : Promise.resolve({ rows: [] }),
    ]);

    const businessName =
      businessResult.rows[0]?.name ?? "Alias event workspace";
    const owner = ownerResult.rows[0] ?? null;

    const locationSummary = summarizeEventLocation(event);

    const emailTasks: Array<Promise<unknown>> = [
      sendEventRegistrationConfirmationEmail({
        recipient: attendeeEmail,
        attendeeName,
        eventTitle: event.title,
        businessName,
        startTimeIso: event.startTime,
        endTimeIso: event.endTime,
        timezone: event.timezone,
        locationSummary,
        virtualMeetingUrl: event.virtualMeetingUrl ?? undefined,
      }),
    ];

    if (owner?.email) {
      emailTasks.push(
        sendEventRegistrationNotificationEmail({
          recipient: owner.email,
          attendeeName,
          attendeeEmail,
          attendeePhone: attendeePhone ?? undefined,
          eventTitle: event.title,
          businessName,
          startTimeIso: event.startTime,
          endTimeIso: event.endTime,
          timezone: event.timezone,
          locationSummary,
          notes: notes ?? undefined,
        }),
      );
    }

    void Promise.allSettled(emailTasks);

    return NextResponse.json({ event, registration });
  } catch (error) {
    const message = (error as Error).message;
    const conflictTriggers = [
      "Event is at capacity",
      "You're already registered for this event.",
      "Registration is closed for this event",
      "Event has already started",
    ];

    if (message === "Event not available") {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    const status = conflictTriggers.some((trigger) => message.startsWith(trigger))
      ? 409
      : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
