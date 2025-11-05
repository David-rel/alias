"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  FiArrowRight,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiCopy,
  FiLink,
  FiUsers,
} from "react-icons/fi";
import type { EventWithStats } from "@/types/events";

type EventCardProps = {
  event: EventWithStats;
  shareBaseUrl?: string;
};

function formatDateRange(event: EventWithStats) {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: event.timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: event.timezone,
    hour: "numeric",
    minute: "2-digit",
  });

  return {
    dateRange: dateFormatter.format(start),
    timeRange: `${timeFormatter.format(start)} – ${timeFormatter.format(end)} ${event.timezone}`,
  };
}

function describeLocation(event: EventWithStats) {
  switch (event.eventType) {
    case "in_person":
      return event.locationAddress ?? "In-person gathering";
    case "online":
      return event.virtualMeetingUrl ?? event.locationDetails ?? "Online event";
    default: {
      const pieces = [
        event.locationAddress ?? null,
        event.virtualMeetingUrl ? `Virtual link ready` : null,
        event.locationDetails ?? null,
      ].filter(Boolean);
      return pieces.join(" · ") || "Hybrid event";
    }
  }
}

function statusStyles(status: EventWithStats["status"]) {
  if (status === "published") {
    return "border-[#23a5fe]/40 bg-[#23a5fe]/10 text-[#23a5fe]";
  }
  if (status === "draft") {
    return "border-white/10 bg-white/5 text-white/60";
  }
  if (status === "completed") {
    return "border-emerald-400/50 bg-emerald-400/10 text-emerald-200";
  }
  return "border-[#ff6b6b]/30 bg-[#ff6b6b]/10 text-[#ff9d9d]";
}

export function EventCard({ event, shareBaseUrl }: EventCardProps) {
  const [copied, setCopied] = useState<boolean>(false);
  const dateLabel = useMemo(() => formatDateRange(event), [event]);
  const location = useMemo(() => describeLocation(event), [event]);
  const shareUrl = useMemo(() => {
    if (!shareBaseUrl || event.status !== "published") {
      return null;
    }
    return `${shareBaseUrl}/${event.shareId}`;
  }, [event.shareId, event.status, shareBaseUrl]);

  const spotsRemaining =
    event.capacityRemaining === null
      ? "Unlimited capacity"
      : `${event.capacityRemaining} spots left`;

  async function handleCopyLink() {
    if (!shareUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (copyError) {
      console.error("Failed to copy link", copyError);
    }
  }

  return (
    <article className="flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_40px_100px_rgba(3,22,45,0.45)]">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] ${statusStyles(event.status)}`}
          >
            {event.status}
          </span>
          <h3 className="text-2xl font-semibold tracking-tight">
            {event.title}
          </h3>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs text-white/60">
          <p className="flex items-center gap-2">
            <FiCalendar /> {dateLabel.dateRange}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/70">
        <p className="flex items-center gap-2 text-white">
          <FiCalendar className="text-[#3eb6fd]" />
          {dateLabel.timeRange}
        </p>
        <p className="flex items-center gap-2">
          <FiLink className="text-[#3eb6fd]" />
          {location}
        </p>
        <div className="flex flex-wrap gap-3 pt-2 text-xs text-white/60">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
            <FiUsers /> {event.registrationCount} registered
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
            <FiCheckCircle /> {event.checkedInCount} checked in
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
            {spotsRemaining}
          </span>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-6">
        {shareUrl ? (
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#23a5fe]/60 bg-[#23a5fe]/15 px-5 py-2 text-xs font-semibold text-[#23a5fe] transition hover:bg-[#23a5fe]/30"
          >
            {copied ? (
              <>
                <FiCheck /> Copied
              </>
            ) : (
              <>
                <FiCopy /> Copy public link
              </>
            )}
          </button>
        ) : (
          <p className="text-xs text-white/40">
            Publish this event to generate a shareable link.
          </p>
        )}

        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href={`/app/event-scheduler/${event.id}`}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-2 font-semibold text-white transition hover:border-[#3eb6fd]/60 hover:bg-[#062951]"
          >
            Manage event <FiArrowRight />
          </Link>
          <Link
            href={`/app/event-scheduler/${event.id}/check-in`}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-2 font-semibold text-white transition hover:border-[#3eb6fd]/60 hover:bg-[#062951]"
          >
            Check-in desk <FiArrowRight />
          </Link>
        </div>
      </div>
    </article>
  );
}
