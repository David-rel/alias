import { randomBytes } from "node:crypto";
import { DatabaseError } from "pg";
import {
  pool,
  query,
  type DbEventRegistrationRow,
  type DbEventRow,
  type QueryParam,
} from "./db";
import type {
  CreateEventInput,
  CreateEventRegistrationInput,
  Event,
  EventRegistration,
  EventStatus,
  EventType,
  EventWithStats,
  UpdateEventInput,
} from "@/types/events";

const EVENT_SHARE_ID_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
const EVENT_SHARE_ID_LENGTH = 12;

type DbEventWithStatsRow = DbEventRow & {
  total_registrations: string | number | null;
  active_registrations: string | number | null;
  checked_in_registrations: string | number | null;
};

type EventCountSnapshot = {
  total_registrations: number;
  active_registrations: number;
  checked_in_registrations: number;
};

function sanitizeText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseDate(value: unknown, label: string): Date {
  if (typeof value !== "string") {
    throw new Error(`Invalid ${label}`);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${label}`);
  }

  return parsed;
}

function parseOptionalDate(value: unknown, label: string): Date | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return parseDate(value, label);
}

function parseCapacity(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "number" && typeof value !== "string") {
    throw new Error("Invalid capacity");
  }

  const parsed =
    typeof value === "number" ? value : Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed < 1) {
    throw new Error("Capacity must be at least 1");
  }

  return Math.floor(parsed);
}

function assertEventType(value: string): asserts value is EventType {
  if (value === "in_person" || value === "online" || value === "hybrid") {
    return;
  }

  throw new Error(`Unsupported event type: ${value}`);
}

function assertEventStatus(value: string): asserts value is EventStatus {
  if (
    value === "draft" ||
    value === "published" ||
    value === "completed" ||
    value === "cancelled"
  ) {
    return;
  }

  throw new Error(`Unsupported event status: ${value}`);
}

function generateShareIdCandidate(): string {
  const bytes = randomBytes(EVENT_SHARE_ID_LENGTH);
  let result = "";

  for (const byte of bytes) {
    const index = byte % EVENT_SHARE_ID_ALPHABET.length;
    result += EVENT_SHARE_ID_ALPHABET[index] ?? "a";
  }

  return result;
}

export async function generateUniqueEventShareId(): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = generateShareIdCandidate();
    const existing = await query<{ id: string }>(
      `SELECT id
         FROM events
        WHERE share_id = $1
        LIMIT 1`,
      [candidate],
    );

    if (existing.rowCount === 0) {
      return candidate;
    }
  }

  throw new Error("Unable to generate unique event share id");
}

function mapEventRow(row: DbEventRow): Event {
  return {
    id: row.id,
    businessId: row.business_id,
    createdByUserId: row.created_by_user_id,
    title: row.title,
    description: row.description ?? null,
    coverImageUrl: row.cover_image_url ?? null,
    eventType: row.event_type,
    locationAddress: row.location_address ?? null,
    locationDetails: row.location_details ?? null,
    virtualMeetingUrl: row.virtual_meeting_url ?? null,
    timezone: row.timezone,
    startTime: row.start_time.toISOString(),
    endTime: row.end_time.toISOString(),
    registrationDeadline: row.registration_deadline
      ? row.registration_deadline.toISOString()
      : null,
    capacity: row.capacity ?? null,
    shareId: row.share_id,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapEventWithCounts(
  row: DbEventRow,
  counts: EventCountSnapshot,
): EventWithStats {
  const base = mapEventRow(row);
  const total = counts.total_registrations ?? 0;
  const active = counts.active_registrations ?? 0;
  const checkedIn = counts.checked_in_registrations ?? 0;
  const capacityRemaining =
    base.capacity !== null
      ? Math.max(base.capacity - active, 0)
      : null;

  return {
    ...base,
    registrationCount: total,
    checkedInCount: checkedIn,
    capacityRemaining,
  };
}

function mapEventWithStatsRow(row: DbEventWithStatsRow): EventWithStats {
  const counts: EventCountSnapshot = {
    total_registrations: Number(row.total_registrations ?? 0),
    active_registrations: Number(row.active_registrations ?? 0),
    checked_in_registrations: Number(row.checked_in_registrations ?? 0),
  };

  return mapEventWithCounts(row, counts);
}

function mapRegistrationRow(row: DbEventRegistrationRow): EventRegistration {
  return {
    id: row.id,
    eventId: row.event_id,
    attendeeName: row.attendee_name,
    attendeeEmail: row.attendee_email,
    attendeePhone: row.attendee_phone ?? null,
    notes: row.notes ?? null,
    status: row.status,
    checkedInAt: row.checked_in_at ? row.checked_in_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function createEvent(opts: {
  businessId: string;
  createdByUserId: string;
  input: CreateEventInput;
}): Promise<Event> {
  const { businessId, createdByUserId, input } = opts;
  const title = sanitizeText(input.title);

  if (!title) {
    throw new Error("Title is required");
  }

  if (typeof input.timezone !== "string" || input.timezone.trim().length === 0) {
    throw new Error("Timezone is required");
  }

  assertEventType(input.eventType);
  assertEventStatus(input.status);

  const startTime = parseDate(input.startTime, "start time");
  const endTime = parseDate(input.endTime, "end time");
  const registrationDeadline = parseOptionalDate(
    input.registrationDeadline,
    "registration deadline",
  );
  const capacity = parseCapacity(input.capacity);

  if (endTime <= startTime) {
    throw new Error("End time must be after start time");
  }

  if (registrationDeadline && registrationDeadline > startTime) {
    throw new Error("Registration deadline must be before event start time");
  }

  const shareId = await generateUniqueEventShareId();

  const result = await query<DbEventRow>(
    `INSERT INTO events (
       business_id,
       created_by_user_id,
       title,
       description,
       cover_image_url,
       event_type,
       location_address,
       location_details,
       virtual_meeting_url,
       timezone,
       start_time,
       end_time,
       registration_deadline,
       capacity,
       share_id,
       status
     )
     VALUES (
       $1,
       $2,
       $3,
       $4,
       $5,
       $6,
       $7,
       $8,
       $9,
       $10,
       $11,
       $12,
       $13,
       $14,
       $15,
       $16
     )
     RETURNING *`,
    [
      businessId,
      createdByUserId,
      title,
      sanitizeText(input.description),
      sanitizeText(input.coverImageUrl),
      input.eventType,
      sanitizeText(input.locationAddress),
      sanitizeText(input.locationDetails),
      sanitizeText(input.virtualMeetingUrl),
      input.timezone.trim(),
      startTime,
      endTime,
      registrationDeadline,
      capacity,
      shareId,
      input.status,
    ],
  );

  return mapEventRow(result.rows[0]);
}

export async function updateEvent(
  eventId: string,
  businessId: string,
  updates: UpdateEventInput,
): Promise<Event | null> {
  const currentResult = await query<DbEventRow>(
    `SELECT *
       FROM events
      WHERE id = $1
        AND business_id = $2
      LIMIT 1`,
    [eventId, businessId],
  );

  const current = currentResult.rows[0];

  if (!current) {
    return null;
  }

  const setStatements: string[] = [];
  const params: QueryParam[] = [];
  let index = 1;

  if (updates.title !== undefined) {
    const title = sanitizeText(updates.title);
    if (!title) {
      throw new Error("Title is required");
    }
    setStatements.push(`title = $${index}`);
    params.push(title);
    index += 1;
  }

  if (updates.description !== undefined) {
    setStatements.push(`description = $${index}`);
    params.push(sanitizeText(updates.description));
    index += 1;
  }

  if (updates.coverImageUrl !== undefined) {
    setStatements.push(`cover_image_url = $${index}`);
    params.push(sanitizeText(updates.coverImageUrl));
    index += 1;
  }

  if (updates.eventType !== undefined) {
    assertEventType(updates.eventType);
    setStatements.push(`event_type = $${index}`);
    params.push(updates.eventType);
    index += 1;
  }

  if (updates.locationAddress !== undefined) {
    setStatements.push(`location_address = $${index}`);
    params.push(sanitizeText(updates.locationAddress));
    index += 1;
  }

  if (updates.locationDetails !== undefined) {
    setStatements.push(`location_details = $${index}`);
    params.push(sanitizeText(updates.locationDetails));
    index += 1;
  }

  if (updates.virtualMeetingUrl !== undefined) {
    setStatements.push(`virtual_meeting_url = $${index}`);
    params.push(sanitizeText(updates.virtualMeetingUrl));
    index += 1;
  }

  const nextTimezone =
    updates.timezone !== undefined
      ? (() => {
          if (
            typeof updates.timezone !== "string" ||
            updates.timezone.trim().length === 0
          ) {
            throw new Error("Timezone is required");
          }
          return updates.timezone.trim();
        })()
      : current.timezone;

  if (updates.timezone !== undefined) {
    setStatements.push(`timezone = $${index}`);
    params.push(nextTimezone);
    index += 1;
  }

  const nextStart =
    updates.startTime !== undefined
      ? parseDate(updates.startTime, "start time")
      : current.start_time;

  if (updates.startTime !== undefined) {
    setStatements.push(`start_time = $${index}`);
    params.push(nextStart);
    index += 1;
  }

  const nextEnd =
    updates.endTime !== undefined
      ? parseDate(updates.endTime, "end time")
      : current.end_time;

  if (updates.endTime !== undefined) {
    setStatements.push(`end_time = $${index}`);
    params.push(nextEnd);
    index += 1;
  }

  if (nextEnd <= nextStart) {
    throw new Error("End time must be after start time");
  }

  let nextDeadline = current.registration_deadline;

  if (updates.registrationDeadline !== undefined) {
    nextDeadline = parseOptionalDate(
      updates.registrationDeadline,
      "registration deadline",
    );
    setStatements.push(`registration_deadline = $${index}`);
    params.push(nextDeadline);
    index += 1;
  }

  if (nextDeadline && nextDeadline > nextStart) {
    throw new Error("Registration deadline must be before event start time");
  }

  const nextCapacity =
    updates.capacity !== undefined
      ? parseCapacity(updates.capacity)
      : current.capacity;

  if (updates.capacity !== undefined) {
    setStatements.push(`capacity = $${index}`);
    params.push(nextCapacity);
    index += 1;
  }

  if (updates.status !== undefined) {
    assertEventStatus(updates.status);
    setStatements.push(`status = $${index}`);
    params.push(updates.status);
    index += 1;
  }

  if (setStatements.length === 0) {
    return getEvent(eventId, businessId);
  }

  setStatements.push(`updated_at = NOW()`);

  params.push(eventId);
  params.push(businessId);

  const result = await query<DbEventRow>(
    `UPDATE events
        SET ${setStatements.join(", ")}
      WHERE id = $${index}
        AND business_id = $${index + 1}
      RETURNING *`,
    params,
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return mapEventRow(row);
}

export async function deleteEvent(eventId: string, businessId: string) {
  await query(
    `DELETE FROM events
      WHERE id = $1
        AND business_id = $2`,
    [eventId, businessId],
  );
}

export async function getEventsForBusiness(
  businessId: string,
): Promise<EventWithStats[]> {
  const result = await query<DbEventWithStatsRow>(
    `SELECT
       e.*,
       COUNT(r.*) FILTER (WHERE r.status <> 'cancelled') AS total_registrations,
       COUNT(r.*) FILTER (WHERE r.status IN ('registered', 'checked_in')) AS active_registrations,
       COUNT(r.*) FILTER (WHERE r.status = 'checked_in') AS checked_in_registrations
     FROM events e
     LEFT JOIN event_registrations r
       ON r.event_id = e.id
     WHERE e.business_id = $1
     GROUP BY e.id
     ORDER BY e.start_time ASC`,
    [businessId],
  );

  return result.rows.map(mapEventWithStatsRow);
}

export async function getEvent(
  eventId: string,
  businessId: string,
): Promise<Event | null> {
  const result = await query<DbEventRow>(
    `SELECT *
       FROM events
      WHERE id = $1
        AND business_id = $2
      LIMIT 1`,
    [eventId, businessId],
  );

  const row = result.rows[0];
  return row ? mapEventRow(row) : null;
}

export async function getEventWithStats(
  eventId: string,
  businessId: string,
): Promise<EventWithStats | null> {
  const result = await query<DbEventWithStatsRow>(
    `SELECT
       e.*,
       COUNT(r.*) FILTER (WHERE r.status <> 'cancelled') AS total_registrations,
       COUNT(r.*) FILTER (WHERE r.status IN ('registered', 'checked_in')) AS active_registrations,
       COUNT(r.*) FILTER (WHERE r.status = 'checked_in') AS checked_in_registrations
     FROM events e
     LEFT JOIN event_registrations r
       ON r.event_id = e.id
     WHERE e.business_id = $1
       AND e.id = $2
     GROUP BY e.id
     LIMIT 1`,
    [businessId, eventId],
  );

  const row = result.rows[0];
  return row ? mapEventWithStatsRow(row) : null;
}

export async function getEventByShareId(
  shareId: string,
  { withStats = false }: { withStats?: boolean } = {},
): Promise<Event | EventWithStats | null> {
  if (withStats) {
    const result = await query<DbEventWithStatsRow>(
      `SELECT
         e.*,
         COUNT(r.*) FILTER (WHERE r.status <> 'cancelled') AS total_registrations,
         COUNT(r.*) FILTER (WHERE r.status IN ('registered', 'checked_in')) AS active_registrations,
         COUNT(r.*) FILTER (WHERE r.status = 'checked_in') AS checked_in_registrations
       FROM events e
       LEFT JOIN event_registrations r
         ON r.event_id = e.id
       WHERE e.share_id = $1
         AND e.status = 'published'
       GROUP BY e.id
       LIMIT 1`,
      [shareId],
    );

    const row = result.rows[0];
    return row ? mapEventWithStatsRow(row) : null;
  }

  const result = await query<DbEventRow>(
    `SELECT *
       FROM events
      WHERE share_id = $1
        AND status = 'published'
      LIMIT 1`,
    [shareId],
  );

  const row = result.rows[0];
  return row ? mapEventRow(row) : null;
}

export async function getRegistrationsForEvent(
  eventId: string,
  businessId: string,
): Promise<EventRegistration[]> {
  const result = await query<DbEventRegistrationRow>(
    `SELECT r.*
       FROM event_registrations r
       JOIN events e
         ON e.id = r.event_id
      WHERE r.event_id = $1
        AND e.business_id = $2
      ORDER BY r.created_at DESC`,
    [eventId, businessId],
  );

  return result.rows.map(mapRegistrationRow);
}

export async function toggleEventRegistrationCheckIn(opts: {
  eventId: string;
  registrationId: string;
  businessId: string;
  checkedIn: boolean;
}): Promise<EventRegistration | null> {
  const result = await query<DbEventRegistrationRow>(
    `UPDATE event_registrations r
        SET status = CASE WHEN $1::boolean THEN 'checked_in' ELSE 'registered' END,
            checked_in_at = CASE WHEN $1::boolean THEN NOW() ELSE NULL END,
            updated_at = NOW()
      WHERE r.id = $2
        AND r.event_id = $3
        AND EXISTS (
          SELECT 1
            FROM events e
           WHERE e.id = r.event_id
             AND e.business_id = $4
        )
      RETURNING r.*`,
    [opts.checkedIn, opts.registrationId, opts.eventId, opts.businessId],
  );

  const row = result.rows[0];
  return row ? mapRegistrationRow(row) : null;
}

export async function registerAttendeeViaShareId(
  shareId: string,
  payload: CreateEventRegistrationInput,
): Promise<{
  registration: EventRegistration;
  event: EventWithStats;
}> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const eventResult = await client.query<DbEventRow>(
      `SELECT *
         FROM events
        WHERE share_id = $1
          AND status = 'published'
        LIMIT 1
        FOR UPDATE`,
      [shareId],
    );

    const eventRow = eventResult.rows[0];

    if (!eventRow) {
      throw new Error("Event not available");
    }

    const now = new Date();

    if (eventRow.registration_deadline && eventRow.registration_deadline < now) {
      throw new Error("Registration is closed for this event");
    }

    if (eventRow.start_time < now) {
      throw new Error("Event has already started");
    }

    const attendeeName = sanitizeText(payload.attendeeName);
    const attendeeEmail = sanitizeText(payload.attendeeEmail);
    const attendeePhone = sanitizeText(payload.attendeePhone);
    const notes = sanitizeText(payload.notes);

    if (!attendeeName) {
      throw new Error("Name is required");
    }

    if (!attendeeEmail) {
      throw new Error("Email is required");
    }

    const countsResult = await client.query<{
      active_count: number;
      total_count: number;
      checked_in_count: number;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('registered', 'checked_in'))::int AS active_count,
         COUNT(*) FILTER (WHERE status <> 'cancelled')::int AS total_count,
         COUNT(*) FILTER (WHERE status = 'checked_in')::int AS checked_in_count
       FROM event_registrations
      WHERE event_id = $1`,
      [eventRow.id],
    );

    const counters = countsResult.rows[0] ?? {
      active_count: 0,
      total_count: 0,
      checked_in_count: 0,
    };

    if (
      eventRow.capacity !== null &&
      counters.active_count >= eventRow.capacity
    ) {
      throw new Error("Event is at capacity");
    }

    let registrationRow: DbEventRegistrationRow | undefined;

    try {
      const insertResult = await client.query<DbEventRegistrationRow>(
        `INSERT INTO event_registrations (
           event_id,
           attendee_name,
           attendee_email,
           attendee_phone,
           notes,
           status
         )
         VALUES ($1, $2, $3, $4, $5, 'registered')
         RETURNING *`,
        [
          eventRow.id,
          attendeeName,
          attendeeEmail,
          attendeePhone,
          notes,
        ],
      );

      registrationRow = insertResult.rows[0];
    } catch (error) {
      if (
        error instanceof DatabaseError &&
        error.code === "23505"
      ) {
        throw new Error("You're already registered for this event.");
      }

      throw error;
    }

    if (!registrationRow) {
      throw new Error("Unable to save registration");
    }

    const updatedCounts: EventCountSnapshot = {
      total_registrations: counters.total_count + 1,
      active_registrations: counters.active_count + 1,
      checked_in_registrations: counters.checked_in_count,
    };

    await client.query("COMMIT");

    return {
      registration: mapRegistrationRow(registrationRow),
      event: mapEventWithCounts(eventRow, updatedCounts),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
