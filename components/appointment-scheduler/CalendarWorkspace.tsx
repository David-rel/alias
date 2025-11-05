"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  FiClock,
  FiCopy,
  FiEdit3,
  FiGlobe,
  FiLoader,
  FiMapPin,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import type { BusinessRole } from "@/types/business";
import type {
  AppointmentAvailabilityRule,
  AppointmentBooking,
  AppointmentCalendar,
  AppointmentBookingStatus,
  DayAvailability,
} from "@/types/appointments";

type CalendarWorkspaceProps = {
  calendar: AppointmentCalendar;
  rules: AppointmentAvailabilityRule[];
  availability: DayAvailability[];
  bookings: AppointmentBooking[];
  shareUrl?: string;
  role: BusinessRole;
};

type DraftRule = {
  id?: string;
  ruleType: "weekly" | "date";
  dayOfWeek: number | null;
  specificDate: string | null;
  startMinutes: number;
  endMinutes: number;
  isUnavailable: boolean;
};

const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const STATUS_META: Record<
  AppointmentBookingStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending review",
    className: "bg-amber-500/15 text-amber-200 border border-amber-400/40",
  },
  scheduled: {
    label: "Scheduled",
    className: "bg-emerald-500/15 text-emerald-200 border border-emerald-400/40",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-500/15 text-red-200 border border-red-400/40",
  },
  completed: {
    label: "Completed",
    className: "bg-slate-500/20 text-slate-200 border border-slate-400/40",
  },
};

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
}

function timeToMinutes(value: string): number {
  const [hour, minute] = value.split(":").map((part) => Number.parseInt(part, 10));
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    throw new Error("Invalid time");
  }
  return hour * 60 + minute;
}

function formatBookingRow(booking: AppointmentBooking, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return formatter.formatRange(new Date(booking.startTime), new Date(booking.endTime));
}

export function CalendarWorkspace({
  calendar,
  rules: initialRules,
  availability: initialAvailability,
  bookings: initialBookings,
  shareUrl,
  role,
}: CalendarWorkspaceProps) {
  const [rules, setRules] = useState<DraftRule[]>(() =>
    initialRules.map((rule) => ({ ...rule })),
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [copySuccess, setCopySuccess] = useState(false);
  const [bookingList, setBookingList] =
    useState<AppointmentBooking[]>(initialBookings);
  const [liveAvailability, setLiveAvailability] =
    useState<DayAvailability[]>(initialAvailability);
  const [processing, startProcessing] = useTransition();
  const [bookingActionId, setBookingActionId] = useState<string | null>(null);
  const [bookingMessage, setBookingMessage] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const canEdit = role === "owner" || role === "admin";

  const groupedRules = useMemo(() => {
    const weekly = rules.filter((rule) => rule.ruleType === "weekly");
    return WEEKDAY_LABELS.map((label, index) => ({
      label,
      day: index,
      items: weekly
        .filter((rule) => rule.dayOfWeek === index && !rule.isUnavailable)
        .sort((a, b) => a.startMinutes - b.startMinutes),
    }));
  }, [rules]);

  useEffect(() => {
    setBookingList(initialBookings);
    setBookingMessage(null);
    setBookingError(null);
  }, [initialBookings]);

  useEffect(() => {
    setLiveAvailability(initialAvailability);
  }, [initialAvailability]);

  async function handleCopyShareUrl() {
    if (!shareUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error(err);
    }
  }

  function addDraftRule(dayOfWeek: number) {
    const newRule: DraftRule = {
      ruleType: "weekly",
      dayOfWeek,
      specificDate: null,
      startMinutes: 540,
      endMinutes: 600,
      isUnavailable: false,
    };

    setRules((current) => [...current, newRule]);
  }

  function updateDraftRule(index: number, updates: Partial<DraftRule>) {
    setRules((current) => {
      const next = [...current];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  }

  function removeRule(index: number) {
    setRules((current) => current.filter((_, position) => position !== index));
  }

  function saveRules() {
    setError(null);
    setNotice(null);

    startSaving(async () => {
      try {
        const response = await fetch(`/api/appointment-scheduler/calendars/${calendar.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ rules }),
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error ?? "Failed to update availability");
        }

        const payload = (await response.json()) as { rules: AppointmentAvailabilityRule[] };
        setRules(payload.rules.map((rule) => ({ ...rule })));
        setNotice("Availability refreshed.");
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  function statusBadge(booking: AppointmentBooking) {
    const meta = STATUS_META[booking.status];
    return (
      <span
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${meta.className}`}
      >
        {meta.label}
      </span>
    );
  }

  function promptForDeclineReason(): string | null {
    if (typeof window === "undefined") {
      return null;
    }

    const value = window.prompt("Add a note for the guest (optional):", "");

    if (value == null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  function handleBookingAction(
    booking: AppointmentBooking,
    nextStatus: "scheduled" | "cancelled",
  ) {
    let reason: string | null = null;

    if (nextStatus === "cancelled") {
      reason = promptForDeclineReason();
    }

    setBookingError(null);
    setBookingMessage(null);
    setBookingActionId(booking.id);

    startProcessing(async () => {
      try {
        const response = await fetch(
          `/api/appointment-scheduler/calendars/${calendar.id}/bookings/${booking.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: nextStatus, reason }),
          },
        );

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error ?? "Failed to update booking");
        }

        const payload = (await response.json()) as {
          booking: AppointmentBooking;
          availability: DayAvailability[];
        };

        setBookingList((current) =>
          current.map((item) =>
            item.id === payload.booking.id ? payload.booking : item,
          ),
        );
        setLiveAvailability(payload.availability);
        setBookingMessage(
          nextStatus === "scheduled"
            ? "Booking approved and guest notified."
            : "Booking cancelled and guest notified.",
        );
      } catch (err) {
        setBookingError((err as Error).message);
      } finally {
        setBookingActionId(null);
      }
    });
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-linear-to-br from-[#03162d] via-[#052041] to-[#0b3670] p-8 text-white shadow-[0_40px_130px_rgba(3,22,45,0.58)] lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-[#3eb6fd]">
            Calendar overview
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{calendar.name}</h1>
          {calendar.description ? (
            <p className="max-w-2xl text-sm text-white/75">{calendar.description}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/70">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
              <FiClock /> {calendar.durationMinutes} minute meetings
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
              <FiGlobe /> {calendar.timezone}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
              <FiMapPin /> {calendar.locationType.replace("_", " ")}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-3 text-sm text-white/80">
          {shareUrl ? (
            <button
              type="button"
              onClick={handleCopyShareUrl}
              className="inline-flex items-center gap-2 rounded-full border border-[#23a5fe]/40 bg-[#23a5fe]/10 px-5 py-2 text-sm font-semibold text-[#3eb6fd] transition hover:bg-[#23a5fe]/20"
            >
              <FiCopy />
              {copySuccess ? "Copied" : "Copy booking link"}
            </button>
          ) : null}
          <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-xs text-white/70">
            <p className="font-semibold text-white">Buffer rules</p>
            <p>
              +{calendar.bufferBeforeMinutes} min before · +{calendar.bufferAfterMinutes} min after · Notice {calendar.minScheduleNoticeMinutes} min
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <article className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg">
            <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Weekly availability</h2>
                <p className="text-sm text-white/60">
                  Publish the recurring windows clients can book. Add overrides later for holidays.
                </p>
              </div>
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => addDraftRule(1)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:border-[#3eb6fd]/60 hover:bg-[#031c39]"
                >
                  <FiPlus /> Add block
                </button>
              ) : null}
            </header>

            <div className="space-y-4">
              {groupedRules.map(({ label, day, items }) => (
                <div key={day} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{label}</p>
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => addDraftRule(day)}
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/70 transition hover:border-[#3eb6fd]/60 hover:text-white"
                      >
                        <FiPlus /> Window
                      </button>
                    ) : null}
                  </div>
                  {items.length > 0 ? (
                    <ul className="mt-3 space-y-3">
                      {items.map((rule, index) => {
                        const ruleIndex = rules.indexOf(rule);

                        if (ruleIndex === -1) {
                          return null;
                        }

                        return (
                          <li
                            key={`${day}-${index}-${rule.startMinutes}`}
                            className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/80"
                          >
                            <FiClock className="text-[#3eb6fd]" />
                            <span className="font-semibold text-white">
                              {minutesToTime(rule.startMinutes)} – {minutesToTime(rule.endMinutes)}
                            </span>
                            {canEdit ? (
                              <div className="ml-auto flex items-center gap-2">
                                <label className="flex items-center gap-2">
                                  <span>Start</span>
                                  <input
                                    type="time"
                                    value={minutesToTime(rule.startMinutes)}
                                    onChange={(event) =>
                                      updateDraftRule(ruleIndex, {
                                        startMinutes: timeToMinutes(event.target.value),
                                      })
                                    }
                                    className="rounded-xl border border-white/15 bg-white/10 px-2 py-1 text-white focus:border-[#3eb6fd] focus:outline-none"
                                  />
                                </label>
                                <label className="flex items-center gap-2">
                                  <span>End</span>
                                  <input
                                    type="time"
                                    value={minutesToTime(rule.endMinutes)}
                                    onChange={(event) =>
                                      updateDraftRule(ruleIndex, {
                                        endMinutes: timeToMinutes(event.target.value),
                                      })
                                    }
                                    className="rounded-xl border border-white/15 bg-white/10 px-2 py-1 text-white focus:border-[#3eb6fd] focus:outline-none"
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => removeRule(ruleIndex)}
                                  className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-200 transition hover:border-red-400/70"
                                >
                                  <FiTrash2 /> Remove
                                </button>
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-3 rounded-2xl border border-dashed border-white/15 bg-[#031c39]/50 px-4 py-3 text-xs text-white/50">
                      No openings yet. Add a window for {label.toLowerCase()}.
                    </p>
                  )}
                </div>
              ))}
            </div>

            {canEdit ? (
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <button
                  type="button"
                  onClick={saveRules}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full bg-[#23a5fe] px-6 py-3 text-sm font-semibold text-[#03162d] shadow-[0_18px_45px_rgba(35,165,254,0.45)] transition hover:scale-[1.01] hover:bg-[#3eb6fd] disabled:cursor-not-allowed disabled:bg-[#1d466c] disabled:text-white/50"
                >
                  {saving ? <FiLoader className="animate-spin" /> : <FiEdit3 />} Save availability
                </button>
                {notice ? (
                  <p className="text-xs text-[#3eb6fd]">{notice}</p>
                ) : null}
                {error ? (
                  <p className="text-xs text-red-300">{error}</p>
                ) : null}
              </div>
            ) : null}
          </article>

          <article className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg">
            <header className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Live availability</h2>
              <span className="text-xs text-white/50">Next 14 days</span>
            </header>
            {liveAvailability.length > 0 ? (
              <ul className="grid gap-3 md:grid-cols-2">
                {liveAvailability.slice(0, 6).map((day) => (
                  <li key={day.date} className="space-y-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/80">
                    <p className="font-semibold text-white">
                      {new Intl.DateTimeFormat("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      }).format(new Date(`${day.date}T00:00:00`))}
                    </p>
                    <ul className="space-y-1">
                      {day.slots.slice(0, 4).map((slot) => (
                        <li key={slot.start} className="text-white/70">
                          {new Intl.DateTimeFormat("en-US", {
                            timeZone: calendar.timezone,
                            hour: "numeric",
                            minute: "2-digit",
                          }).format(new Date(slot.start))}
                        </li>
                      ))}
                    </ul>
                    {day.slots.length > 4 ? (
                      <p className="text-white/50">+{day.slots.length - 4} more slots</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-white/15 bg-[#031c39]/40 px-4 py-3 text-sm text-white/50">
                Publish availability to open this calendar to customers.
              </p>
            )}
          </article>
        </div>

        <aside className="space-y-6">
          <article className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/80">
            <h2 className="text-lg font-semibold text-white">Upcoming bookings</h2>
            {bookingMessage ? (
              <p className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200">
                {bookingMessage}
              </p>
            ) : null}
            {bookingError ? (
              <p className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-2 text-xs text-red-200">
                {bookingError}
              </p>
            ) : null}
            {bookingList.length > 0 ? (
              <ul className="space-y-3">
                {bookingList.slice(0, 8).map((booking) => {
                  const isPending = booking.status === "pending";
                  const busy = processing && bookingActionId === booking.id;
                  return (
                    <li key={booking.id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <p className="text-white font-semibold">
                        {booking.guestName}
                      </p>
                      <p>{booking.guestEmail}</p>
                      <p className="text-white/60">
                        {formatBookingRow(booking, calendar.timezone)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {statusBadge(booking)}
                        {isPending && canEdit ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleBookingAction(booking, "scheduled")}
                              disabled={busy}
                              className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200 transition hover:border-emerald-300/60 disabled:opacity-50"
                            >
                              {busy ? <FiLoader className="h-3 w-3 animate-spin" /> : null}
                              Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBookingAction(booking, "cancelled")}
                              disabled={busy}
                              className="inline-flex items-center gap-2 rounded-full border border-red-400/40 bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-200 transition hover:border-red-300/60 disabled:opacity-50"
                            >
                              {busy ? <FiLoader className="h-3 w-3 animate-spin" /> : null}
                              Decline
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-white/15 bg-[#031c39]/40 px-4 py-3 text-sm text-white/50">
                No bookings yet. Share the link to start collecting appointments.
              </p>
            )}
          </article>

          <article className="space-y-2 rounded-3xl border border-white/10 bg-[#03162d] p-6 text-sm text-white/70">
            <h2 className="text-lg font-semibold text-white">Automation plan</h2>
            <ul className="space-y-2 text-xs">
              <li>• Enable Google Calendar sync to push confirmed events instantly.</li>
              <li>• Activate email + SMS nudges to reduce no-shows.</li>
              <li>• Add a workflow trigger for post-meeting follow-up tasks.</li>
            </ul>
          </article>
        </aside>
      </section>
    </div>
  );
}
