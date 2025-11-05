import { randomBytes } from "node:crypto";
import { DatabaseError, QueryResult } from "pg";
import {
  pool,
  query,
  type DbAppointmentAvailabilityRuleRow,
  type DbAppointmentBookingRow,
  type DbAppointmentCalendarRow,
  type QueryParam,
} from "./db";
import type {
  AppointmentAvailabilityRule,
  AppointmentAvailabilityRuleInput,
  AppointmentBooking,
  AppointmentBookingStatus,
  AppointmentCalendar,
  AppointmentLocationType,
  CalendarSummary,
  DayAvailability,
} from "@/types/appointments";

const CALENDAR_SHARE_ID_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
const CALENDAR_SHARE_ID_LENGTH = 12;

function mapCalendarRow(row: DbAppointmentCalendarRow): AppointmentCalendar {
  return {
    id: row.id,
    businessId: row.business_id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    appointmentType: row.appointment_type,
    description: row.description,
    locationType: row.location_type,
    locationDetails: row.location_details,
    virtualMeetingPreference: row.virtual_meeting_preference,
    durationMinutes: row.duration_minutes,
    bufferBeforeMinutes: row.buffer_before_minutes,
    bufferAfterMinutes: row.buffer_after_minutes,
    timezone: row.timezone,
    shareId: row.share_id,
    bookingWindowDays: row.booking_window_days,
    minScheduleNoticeMinutes: row.min_schedule_notice_minutes,
    status: row.status,
    requiresConfirmation: row.requires_confirmation,
    googleCalendarSync: row.google_calendar_sync,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapAvailabilityRuleRow(
  row: DbAppointmentAvailabilityRuleRow
): AppointmentAvailabilityRule {
  return {
    id: row.id,
    calendarId: row.calendar_id,
    ruleType: row.rule_type,
    dayOfWeek: row.day_of_week ?? null,
    specificDate: row.specific_date
      ? row.specific_date.toISOString().slice(0, 10)
      : null,
    startMinutes: row.start_minutes,
    endMinutes: row.end_minutes,
    isUnavailable: row.is_unavailable,
  };
}

export function mapBookingRow(
  row: DbAppointmentBookingRow
): AppointmentBooking {
  return {
    id: row.id,
    calendarId: row.calendar_id,
    shareId: row.share_id,
    guestName: row.guest_name,
    guestEmail: row.guest_email,
    guestTimezone: row.guest_timezone,
    guestNotes: row.guest_notes,
    startTime: row.start_time.toISOString(),
    endTime: row.end_time.toISOString(),
    status: row.status,
    meetingUrl: row.meeting_url,
    meetingLocation: row.meeting_location,
    externalEventId: row.external_event_id,
    externalCalendar: row.external_calendar,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function generateShareIdCandidate(): string {
  const bytes = randomBytes(CALENDAR_SHARE_ID_LENGTH);
  let result = "";

  for (const byte of bytes) {
    const index = byte % CALENDAR_SHARE_ID_ALPHABET.length;
    result += CALENDAR_SHARE_ID_ALPHABET[index] ?? "a";
  }

  return result;
}

export async function generateUniqueCalendarShareId(): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = generateShareIdCandidate();
    const existing = await query<{ id: string }>(
      `SELECT id FROM appointment_calendars WHERE share_id = $1 LIMIT 1`,
      [candidate]
    );

    if (existing.rowCount === 0) {
      return candidate;
    }
  }

  throw new Error("Unable to generate unique calendar share id");
}

function assertLocationType(
  value: string
): asserts value is AppointmentLocationType {
  if (
    value === "in_person" ||
    value === "virtual" ||
    value === "phone" ||
    value === "custom"
  ) {
    return;
  }

  throw new Error(`Unsupported location type: ${value}`);
}

export async function getCalendarsForBusiness(
  businessId: string
): Promise<AppointmentCalendar[]> {
  const result = await query<DbAppointmentCalendarRow>(
    `SELECT *
       FROM appointment_calendars
      WHERE business_id = $1
      ORDER BY created_at DESC`,
    [businessId]
  );

  return result.rows.map(mapCalendarRow);
}

export async function getCalendarById(
  calendarId: string,
  businessId: string
): Promise<AppointmentCalendar | null> {
  const result = await query<DbAppointmentCalendarRow>(
    `SELECT *
       FROM appointment_calendars
      WHERE id = $1 AND business_id = $2
      LIMIT 1`,
    [calendarId, businessId]
  );

  const row = result.rows[0];
  return row ? mapCalendarRow(row) : null;
}

export async function getCalendarByShareId(
  shareId: string
): Promise<AppointmentCalendar | null> {
  const result = await query<DbAppointmentCalendarRow>(
    `SELECT *
       FROM appointment_calendars
      WHERE share_id = $1 AND status = 'active'
      LIMIT 1`,
    [shareId]
  );

  const row = result.rows[0];
  return row ? mapCalendarRow(row) : null;
}

export async function createAppointmentCalendar(opts: {
  businessId: string;
  ownerUserId: string;
  name: string;
  appointmentType: string;
  description: string | null;
  locationType: AppointmentLocationType;
  locationDetails: string | null;
  virtualMeetingPreference: string | null;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  timezone: string;
  bookingWindowDays: number;
  minScheduleNoticeMinutes: number;
  requiresConfirmation: boolean;
  googleCalendarSync: boolean;
}): Promise<AppointmentCalendar> {
  assertLocationType(opts.locationType);

  const shareId = await generateUniqueCalendarShareId();

  const result = await query<DbAppointmentCalendarRow>(
    `INSERT INTO appointment_calendars (
        business_id,
        owner_user_id,
        name,
        appointment_type,
        description,
        location_type,
        location_details,
        virtual_meeting_preference,
        duration_minutes,
        buffer_before_minutes,
        buffer_after_minutes,
        timezone,
        share_id,
        booking_window_days,
        min_schedule_notice_minutes,
        requires_confirmation,
        google_calendar_sync
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15, $16, $17
      )
      RETURNING *`,
    [
      opts.businessId,
      opts.ownerUserId,
      opts.name,
      opts.appointmentType,
      opts.description,
      opts.locationType,
      opts.locationDetails,
      opts.virtualMeetingPreference,
      opts.durationMinutes,
      opts.bufferBeforeMinutes,
      opts.bufferAfterMinutes,
      opts.timezone,
      shareId,
      opts.bookingWindowDays,
      opts.minScheduleNoticeMinutes,
      opts.requiresConfirmation,
      opts.googleCalendarSync,
    ]
  );

  return mapCalendarRow(result.rows[0]);
}

export async function updateAppointmentCalendar(
  calendarId: string,
  businessId: string,
  updates: Partial<{
    name: string;
    appointmentType: string;
    description: string | null;
    locationType: AppointmentLocationType;
    locationDetails: string | null;
    virtualMeetingPreference: string | null;
    durationMinutes: number;
    bufferBeforeMinutes: number;
    bufferAfterMinutes: number;
    timezone: string;
    bookingWindowDays: number;
    minScheduleNoticeMinutes: number;
    status: "active" | "inactive";
    requiresConfirmation: boolean;
    googleCalendarSync: boolean;
  }>
): Promise<AppointmentCalendar | null> {
  if (updates.locationType) {
    assertLocationType(updates.locationType);
  }

  const fields: string[] = [];
  const params: QueryParam[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (typeof value === "undefined") {
      continue;
    }

    fields.push(`${key.replace(/([A-Z])/g, "_$1").toLowerCase()} = $${idx}`);
    params.push(value);
    idx += 1;
  }

  if (fields.length === 0) {
    return getCalendarById(calendarId, businessId);
  }

  params.push(calendarId, businessId);

  const result = await query<DbAppointmentCalendarRow>(
    `UPDATE appointment_calendars
        SET ${fields.join(", ")}, updated_at = NOW()
      WHERE id = $${idx} AND business_id = $${idx + 1}
      RETURNING *`,
    params
  );

  const row = result.rows[0];
  return row ? mapCalendarRow(row) : null;
}

export async function deleteAppointmentCalendar(
  calendarId: string,
  businessId: string
): Promise<void> {
  await query(
    `UPDATE appointment_calendars
        SET status = 'inactive', updated_at = NOW()
      WHERE id = $1 AND business_id = $2`,
    [calendarId, businessId]
  );
}

export async function getAvailabilityRulesForCalendar(
  calendarId: string
): Promise<AppointmentAvailabilityRule[]> {
  const result = await query<DbAppointmentAvailabilityRuleRow>(
    `SELECT *
       FROM appointment_availability_rules
      WHERE calendar_id = $1
      ORDER BY rule_type DESC, day_of_week ASC, start_minutes ASC`,
    [calendarId]
  );

  return result.rows.map(mapAvailabilityRuleRow);
}

export async function replaceAvailabilityRules(
  calendarId: string,
  rules: AppointmentAvailabilityRuleInput[]
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `DELETE FROM appointment_availability_rules WHERE calendar_id = $1`,
      [calendarId]
    );

    for (const rule of rules) {
      await client.query(
        `INSERT INTO appointment_availability_rules (
            calendar_id,
            rule_type,
            day_of_week,
            specific_date,
            start_minutes,
            end_minutes,
            is_unavailable
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          calendarId,
          rule.ruleType,
          rule.dayOfWeek,
          rule.specificDate,
          rule.startMinutes,
          rule.endMinutes,
          rule.isUnavailable,
        ]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getBookingsForCalendars(
  calendarIds: string[],
  opts: { includeCancelled?: boolean; upcomingOnly?: boolean } = {}
): Promise<AppointmentBooking[]> {
  if (calendarIds.length === 0) {
    return [];
  }

  const includeCancelled = opts.includeCancelled ?? false;
  const upcomingOnly = opts.upcomingOnly ?? false;

  const conditions: string[] = [`calendar_id = ANY($1)`];
  const params: QueryParam[] = [calendarIds];

  if (!includeCancelled) {
    conditions.push(`status != 'cancelled'`);
  }

  if (upcomingOnly) {
    conditions.push(`start_time >= NOW()`);
  }

  const result = await query<DbAppointmentBookingRow>(
    `SELECT *
       FROM appointment_bookings
      WHERE ${conditions.join(" AND ")}
      ORDER BY start_time ASC`,
    params
  );

  return result.rows.map(mapBookingRow);
}

export async function createBooking(
  opts: {
    calendarId: string;
    createdByUserId?: string | null;
    guestName: string;
    guestEmail: string;
    guestTimezone: string | null;
    guestNotes: string | null;
    startTimeUtc: Date;
    endTimeUtc: Date;
    status?: AppointmentBookingStatus;
    meetingUrl?: string | null;
    meetingLocation?: string | null;
    externalEventId?: string | null;
    externalCalendar?: string | null;
  },
  attempt = 0
): Promise<AppointmentBooking> {
  const shareId = generateShareIdCandidate();

  let result: QueryResult<DbAppointmentBookingRow>;

  try {
    result = await query<DbAppointmentBookingRow>(
      `INSERT INTO appointment_bookings (
        calendar_id,
        created_by_user_id,
        share_id,
        guest_name,
        guest_email,
        guest_timezone,
        guest_notes,
        start_time,
        end_time,
        status,
        meeting_url,
        meeting_location,
        external_event_id,
        external_calendar
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13, $14
      )
      RETURNING *`,
      [
        opts.calendarId,
        opts.createdByUserId ?? null,
        shareId,
        opts.guestName,
        opts.guestEmail,
        opts.guestTimezone,
        opts.guestNotes,
        opts.startTimeUtc,
        opts.endTimeUtc,
        opts.status ?? "scheduled",
        opts.meetingUrl ?? null,
        opts.meetingLocation ?? null,
        opts.externalEventId ?? null,
        opts.externalCalendar ?? null,
      ]
    );
  } catch (error) {
    if (
      attempt === 0 &&
      error instanceof DatabaseError &&
      error.code === "23514" &&
      error.constraint === "appointment_bookings_status_check"
    ) {
      await query(
        "ALTER TABLE appointment_bookings DROP CONSTRAINT IF EXISTS appointment_bookings_status_check"
      );
      await query(
        "ALTER TABLE appointment_bookings ADD CONSTRAINT appointment_bookings_status_check CHECK (status IN ('pending','scheduled','cancelled','completed'))"
      );

      return createBooking(opts, attempt + 1);
    }

    throw error;
  }

  if (!result || !result.rows[0]) {
    throw new Error("Failed to create appointment booking");
  }

  return mapBookingRow(result.rows[0]);
}

type Interval = [number, number];

function intersectInterval(a: Interval, b: Interval): Interval | null {
  const start = Math.max(a[0], b[0]);
  const end = Math.min(a[1], b[1]);
  return end > start ? [start, end] : null;
}

function subtractInterval(interval: Interval, blocker: Interval): Interval[] {
  const overlap = intersectInterval(interval, blocker);
  if (!overlap) {
    return [interval];
  }

  const [start, end] = interval;
  const [blockStart, blockEnd] = overlap;
  const segments: Interval[] = [];

  if (blockStart > start) {
    segments.push([start, blockStart]);
  }

  if (blockEnd < end) {
    segments.push([blockEnd, end]);
  }

  return segments;
}

function subtractIntervals(
  intervals: Interval[],
  blockers: Interval[]
): Interval[] {
  let current = [...intervals];

  for (const blocker of blockers) {
    const next: Interval[] = [];
    for (const interval of current) {
      next.push(...subtractInterval(interval, blocker));
    }
    current = next;
  }

  return current;
}

function getTimezoneOffsetMinutes(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value ?? "0");
  const month = Number(
    parts.find((part) => part.type === "month")?.value ?? "0"
  );
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "0");
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? "0"
  );
  const second = Number(
    parts.find((part) => part.type === "second")?.value ?? "0"
  );

  const reconstructed = Date.UTC(year, month - 1, day, hour, minute, second);
  return Math.round((reconstructed - date.getTime()) / 60000);
}

function calendarDateToUtc(
  dateString: string,
  minutes: number,
  timeZone: string
): Date {
  const [year, month, day] = dateString
    .split("-")
    .map((value) => Number.parseInt(value, 10));
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const base = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const offset = getTimezoneOffsetMinutes(base, timeZone);
  return new Date(base.getTime() - offset * 60000);
}

function utcToCalendarLocalString(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = map.year ?? "0000";
  const month = map.month ?? "00";
  const day = map.day ?? "00";
  const hour = map.hour ?? "00";
  const minute = map.minute ?? "00";

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function dateToCalendarDayString(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

function buildDayIntervals(
  dayRules: AppointmentAvailabilityRule[]
): Interval[] {
  const available = dayRules.filter((rule) => !rule.isUnavailable);
  const unavailable = dayRules.filter((rule) => rule.isUnavailable);

  if (available.length === 0) {
    return [];
  }

  const intervals: Interval[] = available.map((rule) => [
    rule.startMinutes,
    rule.endMinutes,
  ]);

  if (unavailable.length === 0) {
    return intervals;
  }

  const blockers: Interval[] = unavailable.map((rule) => [
    rule.startMinutes,
    rule.endMinutes,
  ]);
  return subtractIntervals(intervals, blockers);
}

function hasConflict(
  startUtc: Date,
  endUtc: Date,
  bookings: AppointmentBooking[]
): boolean {
  for (const booking of bookings) {
    if (booking.status === "cancelled") {
      continue;
    }

    const bookingStart = new Date(booking.startTime);
    const bookingEnd = new Date(booking.endTime);

    const overlaps = bookingStart < endUtc && bookingEnd > startUtc;

    if (overlaps) {
      return true;
    }
  }

  return false;
}

function computeSlotsForDay(opts: {
  date: string;
  calendar: AppointmentCalendar;
  intervals: Interval[];
  existingBookings: AppointmentBooking[];
  minNoticeCutoff: Date;
}): DayAvailability {
  const { date, calendar, intervals, existingBookings, minNoticeCutoff } = opts;
  const slots: DayAvailability["slots"] = [];

  for (const interval of intervals) {
    let current = interval[0] + calendar.bufferBeforeMinutes;
    const latestStart = interval[1] - calendar.bufferAfterMinutes;

    while (
      current + calendar.durationMinutes <= latestStart &&
      current + calendar.durationMinutes <= interval[1]
    ) {
      const slotStartUtc = calendarDateToUtc(date, current, calendar.timezone);
      const slotEndUtc = calendarDateToUtc(
        date,
        current + calendar.durationMinutes,
        calendar.timezone
      );

      if (slotStartUtc < minNoticeCutoff) {
        current +=
          calendar.durationMinutes +
          calendar.bufferBeforeMinutes +
          calendar.bufferAfterMinutes;
        continue;
      }

      if (hasConflict(slotStartUtc, slotEndUtc, existingBookings)) {
        current +=
          calendar.durationMinutes +
          calendar.bufferBeforeMinutes +
          calendar.bufferAfterMinutes;
        continue;
      }

      slots.push({
        start: slotStartUtc.toISOString(),
        end: slotEndUtc.toISOString(),
      });

      current +=
        calendar.durationMinutes +
        calendar.bufferBeforeMinutes +
        calendar.bufferAfterMinutes;
    }
  }

  return { date, slots };
}

function hydrateRulesByDay(
  rules: AppointmentAvailabilityRule[],
  date: string,
  dayOfWeek: number
): AppointmentAvailabilityRule[] {
  const dateSpecific = rules.filter(
    (rule) => rule.ruleType === "date" && rule.specificDate === date
  );

  if (dateSpecific.length > 0) {
    return dateSpecific;
  }

  return rules.filter(
    (rule) => rule.ruleType === "weekly" && rule.dayOfWeek === dayOfWeek
  );
}

export async function getCalendarSummaries(
  businessId: string,
  opts: { days?: number } = {}
): Promise<CalendarSummary[]> {
  const calendars = await getCalendarsForBusiness(businessId);

  if (calendars.length === 0) {
    return [];
  }

  const calendarIds = calendars.map((calendar) => calendar.id);

  const [rulesResult, bookings] = await Promise.all([
    query<DbAppointmentAvailabilityRuleRow>(
      `SELECT *
         FROM appointment_availability_rules
        WHERE calendar_id = ANY($1)
        ORDER BY rule_type DESC, day_of_week ASC, start_minutes ASC`,
      [calendarIds]
    ),
    getBookingsForCalendars(calendarIds, {
      includeCancelled: false,
      upcomingOnly: true,
    }),
  ]);

  const rulesByCalendar = new Map<string, AppointmentAvailabilityRule[]>();

  for (const row of rulesResult.rows) {
    const collection = rulesByCalendar.get(row.calendar_id) ?? [];
    collection.push(mapAvailabilityRuleRow(row));
    rulesByCalendar.set(row.calendar_id, collection);
  }

  const days = Math.min(opts.days ?? 14, 60);
  const now = new Date();

  return calendars.map((calendar) => {
    const calendarRules = rulesByCalendar.get(calendar.id) ?? [];
    const calendarBookings = bookings.filter(
      (booking) => booking.calendarId === calendar.id
    );

    const windowDays = Math.min(calendar.bookingWindowDays, days);
    const dayAvailabilities: DayAvailability[] = [];
    const minNoticeCutoff = new Date(
      now.getTime() + calendar.minScheduleNoticeMinutes * 60000
    );

    for (let offset = 0; offset < windowDays; offset += 1) {
      const day = new Date(now.getTime());
      day.setUTCDate(day.getUTCDate() + offset);

      const dateString = dateToCalendarDayString(day, calendar.timezone);
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: calendar.timezone,
        weekday: "short",
      });
      const weekPart = formatter
        .formatToParts(day)
        .find((part) => part.type === "weekday");
      const dayOfWeek = weekPart
        ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
            weekPart.value.slice(0, 3)
          )
        : day.getUTCDay();

      const dayRules = hydrateRulesByDay(calendarRules, dateString, dayOfWeek);

      if (dayRules.length === 0) {
        continue;
      }

      const intervals = buildDayIntervals(dayRules);

      if (intervals.length === 0) {
        continue;
      }

      const availability = computeSlotsForDay({
        date: dateString,
        calendar,
        intervals,
        existingBookings: calendarBookings,
        minNoticeCutoff,
      });

      if (availability.slots.length > 0) {
        dayAvailabilities.push(availability);
      }
    }

    return {
      ...calendar,
      upcomingAvailability: dayAvailabilities.slice(0, 7),
      upcomingBookings: calendarBookings.slice(0, 10),
    };
  });
}

export async function getAvailabilityWindowForCalendar(opts: {
  calendar: AppointmentCalendar;
  startDate?: Date;
  endDate?: Date;
}): Promise<DayAvailability[]> {
  const { calendar } = opts;
  const startDate = opts.startDate ?? new Date();
  const endDate = opts.endDate ?? new Date(startDate.getTime());
  endDate.setUTCDate(
    startDate.getUTCDate() + Math.min(calendar.bookingWindowDays, 30)
  );

  const rules = await getAvailabilityRulesForCalendar(calendar.id);
  const bookings = await getBookingsForCalendars([calendar.id], {
    includeCancelled: false,
    upcomingOnly: false,
  });

  const results: DayAvailability[] = [];
  const cursor = new Date(startDate.getTime());
  const minNoticeCutoff = new Date(
    startDate.getTime() + calendar.minScheduleNoticeMinutes * 60000
  );

  while (cursor <= endDate) {
    const dateString = dateToCalendarDayString(cursor, calendar.timezone);
    const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: calendar.timezone,
      weekday: "short",
    });
    const weekdayPart = weekdayFormatter
      .formatToParts(cursor)
      .find((part) => part.type === "weekday");
    const weekdayIndex = weekdayPart
      ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
          weekdayPart.value.slice(0, 3)
        )
      : -1;
    const normalizedDayOfWeek =
      weekdayIndex >= 0 ? weekdayIndex : cursor.getUTCDay();

    const dayRules = hydrateRulesByDay(rules, dateString, normalizedDayOfWeek);
    if (dayRules.length === 0) {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      continue;
    }

    const intervals = buildDayIntervals(dayRules);
    if (intervals.length === 0) {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      continue;
    }

    const availability = computeSlotsForDay({
      date: dateString,
      calendar,
      intervals,
      existingBookings: bookings,
      minNoticeCutoff,
    });

    if (availability.slots.length > 0) {
      results.push(availability);
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return results;
}

export function describeSlotForDisplay(
  slotIso: string,
  timeZone: string
): { label: string; local: string } {
  const date = new Date(slotIso);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return {
    label: formatter.format(date),
    local: utcToCalendarLocalString(date, timeZone),
  };
}

export function validateAvailabilityRules(
  rules: AppointmentAvailabilityRuleInput[]
): void {
  for (const rule of rules) {
    if (rule.ruleType === "weekly") {
      if (rule.dayOfWeek == null || rule.dayOfWeek < 0 || rule.dayOfWeek > 6) {
        throw new Error("Weekly rules require a valid dayOfWeek (0-6)");
      }
      if (rule.specificDate) {
        throw new Error("Weekly rules cannot include specificDate");
      }
    }

    if (rule.ruleType === "date") {
      if (!rule.specificDate) {
        throw new Error("Date rules require a specificDate value");
      }
    }

    if (rule.startMinutes < 0 || rule.startMinutes >= 1440) {
      throw new Error("startMinutes must be between 0 and 1439");
    }

    if (rule.endMinutes <= 0 || rule.endMinutes > 1440) {
      throw new Error("endMinutes must be between 1 and 1440");
    }

    if (rule.endMinutes <= rule.startMinutes) {
      throw new Error("endMinutes must be greater than startMinutes");
    }
  }
}

export function ensureSlotIsAvailable(opts: {
  calendar: AppointmentCalendar;
  slotStartIso: string;
  slotEndIso: string;
  bookings: AppointmentBooking[];
}): void {
  const slotStartUtc = new Date(opts.slotStartIso);
  const slotEndUtc = new Date(opts.slotEndIso);

  if (slotEndUtc <= slotStartUtc) {
    throw new Error("Invalid slot duration");
  }

  const conflict = hasConflict(slotStartUtc, slotEndUtc, opts.bookings);
  if (conflict) {
    throw new Error("Selected slot is no longer available");
  }
}
