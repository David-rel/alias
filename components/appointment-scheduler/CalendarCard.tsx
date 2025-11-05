"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  FiCalendar,
  FiClock,
  FiCopy,
  FiEdit2,
  FiExternalLink,
  FiShare2,
  FiUsers,
} from "react-icons/fi";
import type {
  AppointmentCalendar,
  CalendarSummary,
  DayAvailability,
} from "@/types/appointments";

type CalendarCardProps = {
  calendar: CalendarSummary;
  shareBaseUrl?: string;
  onCopyLink?: (calendar: AppointmentCalendar) => void;
};

function formatSlotLabel(slot: { start: string; end: string }, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const endFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  });

  const startDate = new Date(slot.start);
  const endDate = new Date(slot.end);

  return `${formatter.format(startDate)} – ${endFormatter.format(endDate)} ${new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    timeZoneName: "short",
  }).format(startDate).split(" ").pop()}`;
}

function buildShareUrl(shareId: string, baseUrl?: string) {
  if (baseUrl) {
    return `${baseUrl.replace(/\/$/, "")}/${shareId}`;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}/appointment-scheduler/${shareId}`;
  }

  return `/appointment-scheduler/${shareId}`;
}

export function CalendarCard({ calendar, shareBaseUrl, onCopyLink }: CalendarCardProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(
    () => buildShareUrl(calendar.shareId, shareBaseUrl),
    [calendar.shareId, shareBaseUrl],
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopyLink?.(calendar);
    } catch (error) {
      console.error("Failed to copy share link", error);
    }
  }

  const upcomingSlot = calendar.upcomingAvailability[0]?.slots[0] ?? null;
  const shareLabel = copied ? "Copied" : "Copy link";

  return (
    <article className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition hover:border-[#3eb6fd]/70 hover:shadow-[0_35px_120px_rgba(3,22,45,0.45)]">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{calendar.name}</h3>
            <p className="text-xs uppercase tracking-[0.3em] text-[#3eb6fd]">
              {calendar.appointmentType}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#23a5fe]/40 bg-[#23a5fe]/10 px-4 py-1 text-xs font-semibold text-[#3eb6fd]">
            <FiClock /> {calendar.durationMinutes}m
          </span>
        </div>
        {calendar.description ? (
          <p className="text-sm text-white/70">{calendar.description}</p>
        ) : null}
      </header>

      <section className="space-y-3">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70">
          <FiCalendar className="text-[#3eb6fd]" />
          <span>
            Booking window {calendar.bookingWindowDays} days · Minimum notice {calendar.minScheduleNoticeMinutes} mins · Time zone {calendar.timezone}
          </span>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-[0.25em] text-[#3eb6fd]">
            Upcoming availability
          </h4>
          {calendar.upcomingAvailability.length > 0 ? (
            <ul className="space-y-2 text-sm text-white/80">
              {calendar.upcomingAvailability.slice(0, 3).map((day: DayAvailability) => (
                <li
                  key={day.date}
                  className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2"
                >
                  <span className="text-[#3eb6fd]">
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      weekday: "short",
                    }).format(new Date(`${day.date}T00:00:00`))}
                  </span>
                  <span className="text-white/60">·</span>
                  <span>
                    {day.slots
                      .slice(0, 3)
                      .map((slot) => formatSlotLabel(slot, calendar.timezone))
                      .join(" • ")}
                  </span>
                  {day.slots.length > 3 ? (
                    <span className="ml-auto text-xs text-white/50">
                      +{day.slots.length - 3} more
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-white/10 bg-[#031c39]/40 px-4 py-3 text-sm text-white/50">
              No windows published yet. Add weekly availability to open this calendar.
            </p>
          )}
        </div>
      </section>

      <footer className="flex flex-col gap-3 text-sm text-white/80">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:border-[#3eb6fd]/60 hover:bg-[#052041]"
          >
            <FiCopy className={copied ? "text-[#3eb6fd]" : undefined} /> {shareLabel}
          </button>
          <Link
            href={`/app/appointment-scheduler/${calendar.id}`}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:border-[#3eb6fd]/60 hover:bg-[#052041]"
          >
            <FiEdit2 /> Manage
          </Link>
          <Link
            href={`/appointment-scheduler/${calendar.shareId}`}
            className="inline-flex items-center gap-2 rounded-full border border-[#23a5fe]/40 bg-[#23a5fe]/10 px-4 py-2 text-xs font-semibold text-[#3eb6fd] transition hover:bg-[#23a5fe]/20"
          >
            <FiExternalLink /> Preview
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
          <FiUsers className="text-[#3eb6fd]" /> {calendar.upcomingBookings.length} upcoming bookings
          {calendar.requiresConfirmation ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/40 bg-yellow-400/10 px-3 py-1 text-xs font-semibold text-yellow-200">
              Requires confirmation
            </span>
          ) : null}
          {calendar.googleCalendarSync ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-[#23a5fe]/40 bg-[#23a5fe]/10 px-3 py-1 text-xs font-semibold text-[#3eb6fd]">
              <FiShare2 /> Google sync
            </span>
          ) : null}
        </div>

        {upcomingSlot ? (
          <div className="rounded-2xl border border-[#23a5fe]/40 bg-[#23a5fe]/10 px-4 py-3 text-xs text-[#3eb6fd]">
            Next opening: {formatSlotLabel(upcomingSlot, calendar.timezone)}
          </div>
        ) : null}
      </footer>
    </article>
  );
}
