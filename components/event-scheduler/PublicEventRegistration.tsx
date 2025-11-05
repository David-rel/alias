"use client";

import { useMemo, useState, useTransition } from "react";
import {
  FiCalendar,
  FiCheck,
  FiClock,
  FiGlobe,
  FiLoader,
  FiMapPin,
  FiUsers,
} from "react-icons/fi";
import type {
  EventRegistration,
  EventWithStats,
} from "@/types/events";

type PublicEventRegistrationProps = {
  event: EventWithStats;
};

function formatDate(event: EventWithStats) {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: event.timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: event.timezone,
    hour: "numeric",
    minute: "2-digit",
  });

  return {
    date: dateFormatter.format(start),
    timeRange: `${timeFormatter.format(start)} – ${timeFormatter.format(end)} ${event.timezone}`,
  };
}

function summarizeLocation(event: EventWithStats) {
  if (event.eventType === "in_person") {
    return (
      event.locationAddress ??
      event.locationDetails ??
      "In-person event"
    );
  }
  if (event.eventType === "online") {
    return (
      event.virtualMeetingUrl ??
      event.locationDetails ??
      "Online event"
    );
  }

  const pieces = [
    event.locationAddress ?? null,
    event.virtualMeetingUrl ?? null,
    event.locationDetails ?? null,
  ].filter(Boolean);
  return pieces.join(" · ") || "Hybrid event";
}

export function PublicEventRegistration({
  event,
}: PublicEventRegistrationProps) {
  const [eventSnapshot, setEventSnapshot] =
    useState<EventWithStats>(event);
  const [registration, setRegistration] =
    useState<EventRegistration | null>(null);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const formatted = useMemo(
    () => formatDate(eventSnapshot),
    [eventSnapshot],
  );

  const location = useMemo(
    () => summarizeLocation(eventSnapshot),
    [eventSnapshot],
  );

  const registrationDeadline = eventSnapshot.registrationDeadline
    ? new Date(eventSnapshot.registrationDeadline)
    : null;
  const eventStart = new Date(eventSnapshot.startTime);
  const now = new Date();
  const registrationClosed =
    (registrationDeadline && registrationDeadline < now) ||
    eventStart < now;
  const capacityFull =
    eventSnapshot.capacityRemaining !== null &&
    eventSnapshot.capacityRemaining <= 0;

  const formDisabled =
    registrationClosed || capacityFull || Boolean(registration);

  async function handleSubmit(eventForm: React.FormEvent<HTMLFormElement>) {
    eventForm.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/event-scheduler/public/${eventSnapshot.shareId}/registrations`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              attendeeName: name.trim(),
              attendeeEmail: email.trim(),
              attendeePhone: phone.trim() || null,
              notes: notes.trim() || null,
            }),
          },
        );

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error ?? "Unable to save registration");
        }

        const payload = (await response.json()) as {
          event: EventWithStats;
          registration: EventRegistration;
        };

        setEventSnapshot(payload.event);
        setRegistration(payload.registration);
      } catch (submissionError) {
        setError((submissionError as Error).message);
      }
    });
  }

  const successView = registration ? (
    <section className="space-y-6 rounded-3xl border border-[#23a5fe]/30 bg-[#23a5fe]/10 p-6 text-[#03162d] shadow-[0_45px_120px_rgba(35,165,254,0.35)]">
      <div className="flex items-center gap-3 text-[#0064d6]">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#23a5fe]/50 bg-[#23a5fe]/20">
          <FiCheck />
        </div>
        <div>
          <h2 className="text-xl font-semibold">You&apos;re registered!</h2>
          <p className="text-sm text-[#0f2747]">
            A confirmation email is headed to {registration.attendeeEmail}.
            We&apos;ll send updates there, too.
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#23a5fe]/40 bg-white/60 px-4 py-3 text-sm">
          <p className="text-xs uppercase tracking-[0.35em] text-[#0f2747]/70">
            Event
          </p>
          <p className="text-base font-semibold text-[#03162d]">
            {eventSnapshot.title}
          </p>
        </div>
        <div className="rounded-2xl border border-[#23a5fe]/40 bg-white/60 px-4 py-3 text-sm">
          <p className="text-xs uppercase tracking-[0.35em] text-[#0f2747]/70">
            Date
          </p>
          <p className="text-base font-semibold text-[#03162d]">
            {formatted.date}
          </p>
          <p className="text-xs text-[#0f2747]">{formatted.timeRange}</p>
        </div>
        <div className="rounded-2xl border border-[#23a5fe]/40 bg-white/60 px-4 py-3 text-sm">
          <p className="text-xs uppercase tracking-[0.35em] text-[#0f2747]/70">
            Registered as
          </p>
          <p className="text-base font-semibold text-[#03162d]">
            {registration.attendeeName}
          </p>
          <p className="text-xs text-[#0f2747]">
            {registration.attendeeEmail}
          </p>
        </div>
        <div className="rounded-2xl border border-[#23a5fe]/40 bg-white/60 px-4 py-3 text-sm">
          <p className="text-xs uppercase tracking-[0.35em] text-[#0f2747]/70">
            Location
          </p>
          <p className="text-base font-semibold text-[#03162d]">
            {location}
          </p>
        </div>
      </div>
      {eventSnapshot.capacityRemaining !== null ? (
        <p className="text-xs text-[#0f2747]">
          {eventSnapshot.capacityRemaining} spots remain. Invite a friend before we hit capacity.
        </p>
      ) : null}
    </section>
  ) : null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f5f9ff] via-white to-[#e9f3ff]">
      <div className="mx-auto grid min-h-screen max-w-5xl gap-10 px-6 py-16 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-8">
          <div className="space-y-5 rounded-3xl border border-[#cde6ff] bg-white/90 p-8 shadow-[0_60px_140px_rgba(15,35,67,0.12)]">
            <p className="text-xs uppercase tracking-[0.5em] text-[#0064d6]">
              Presented by Alias Events
            </p>
            <h1 className="text-4xl font-bold text-[#03162d]">
              {eventSnapshot.title}
            </h1>
            {eventSnapshot.description ? (
              <p className="text-sm text-[#0f2747]">
                {eventSnapshot.description}
              </p>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[#cde6ff] bg-[#eef6ff] px-4 py-3 text-sm text-[#0f2747]">
                <p className="flex items-center gap-2 font-semibold text-[#03162d]">
                  <FiCalendar /> {formatted.date}
                </p>
                <p className="mt-2 flex items-center gap-2 text-xs">
                  <FiClock /> {formatted.timeRange}
                </p>
              </div>
              <div className="rounded-2xl border border-[#cde6ff] bg-[#eef6ff] px-4 py-3 text-sm text-[#0f2747]">
                <p className="flex items-center gap-2 font-semibold text-[#03162d]">
                  <FiMapPin /> {location}
                </p>
                <p className="mt-2 flex items-center gap-2 text-xs">
                  <FiGlobe /> Hosted in {eventSnapshot.timezone}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-[#0f2747]">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#cde6ff] bg-white px-3 py-1">
                <FiUsers /> {eventSnapshot.registrationCount} attending
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#cde6ff] bg-white px-3 py-1">
                {eventSnapshot.capacityRemaining === null
                  ? "Unlimited capacity"
                  : `${eventSnapshot.capacityRemaining} spots left`}
              </span>
              {registrationDeadline ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-[#cde6ff] bg-white px-3 py-1">
                  <FiClock /> RSVP by{" "}
                  {registrationDeadline.toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              ) : null}
            </div>
          </div>
          {successView}
        </section>

        <aside className="space-y-6">
          {eventSnapshot.coverImageUrl ? (
            <div className="overflow-hidden rounded-3xl border border-[#cde6ff] bg-white shadow-[0_40px_120px_rgba(15,35,67,0.15)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={eventSnapshot.coverImageUrl}
                alt={eventSnapshot.title}
                className="h-60 w-full object-cover"
              />
            </div>
          ) : null}

          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-3xl border border-[#cde6ff] bg-white/90 p-6 shadow-[0_45px_120px_rgba(15,35,67,0.12)]"
          >
            <h2 className="text-lg font-semibold text-[#03162d]">
              Save your seat
            </h2>
            <p className="text-xs text-[#0f2747]/70">
              We&apos;ll send the event details and reminders to your inbox.
            </p>

            <label className="space-y-2 text-sm text-[#03162d]">
              <span className="font-semibold">Name</span>
              <input
                type="text"
                value={name}
                onChange={(input) => setName(input.target.value)}
                className="w-full rounded-2xl border border-[#cde6ff] bg-white px-4 py-3 text-sm text-[#03162d] placeholder-[#0f2747]/40 focus:border-[#0064d6] focus:outline-none"
                placeholder="Ada Lovelace"
                required
                disabled={formDisabled}
              />
            </label>

            <label className="space-y-2 text-sm text-[#03162d]">
              <span className="font-semibold">Email</span>
              <input
                type="email"
                value={email}
                onChange={(input) => setEmail(input.target.value)}
                className="w-full rounded-2xl border border-[#cde6ff] bg-white px-4 py-3 text-sm text-[#03162d] placeholder-[#0f2747]/40 focus:border-[#0064d6] focus:outline-none"
                placeholder="ada@alias.app"
                required
                disabled={formDisabled}
              />
            </label>

            <label className="space-y-2 text-sm text-[#03162d]">
              <span className="font-semibold">Phone (optional)</span>
              <input
                type="tel"
                value={phone}
                onChange={(input) => setPhone(input.target.value)}
                className="w-full rounded-2xl border border-[#cde6ff] bg-white px-4 py-3 text-sm text-[#03162d] placeholder-[#0f2747]/40 focus:border-[#0064d6] focus:outline-none"
                placeholder="+1 (555) 123-4567"
                disabled={formDisabled}
              />
            </label>

            <label className="space-y-2 text-sm text-[#03162d]">
              <span className="font-semibold">Notes</span>
              <textarea
                value={notes}
                onChange={(input) => setNotes(input.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-[#cde6ff] bg-white px-4 py-3 text-sm text-[#03162d] placeholder-[#0f2747]/40 focus:border-[#0064d6] focus:outline-none"
                placeholder="Any accessibility requests or questions?"
                disabled={formDisabled}
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-[#ff6b6b]/40 bg-[#ff6b6b]/10 px-4 py-3 text-xs text-[#b91c1c]">
                {error}
              </div>
            ) : null}

            {registrationClosed ? (
              <div className="rounded-2xl border border-[#facc15]/40 bg-[#facc15]/20 px-4 py-3 text-xs text-[#854d0e]">
                Registration is closed for this event.
              </div>
            ) : null}

            {capacityFull ? (
              <div className="rounded-2xl border border-[#ff6b6b]/40 bg-[#ff6b6b]/10 px-4 py-3 text-xs text-[#b91c1c]">
                We&apos;ve reached capacity. Stay tuned for the next one!
              </div>
            ) : null}

            <button
              type="submit"
              disabled={formDisabled || pending}
              className="w-full rounded-full bg-[#23a5fe] px-6 py-3 text-sm font-semibold text-[#03162d] shadow-[0_18px_45px_rgba(35,165,254,0.4)] transition hover:scale-[1.01] hover:bg-[#3eb6fd] disabled:cursor-not-allowed disabled:bg-[#9fcdfb] disabled:text-white/60"
            >
              {pending ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <FiLoader className="animate-spin" /> Saving
                </span>
              ) : registration ? (
                "Registered"
              ) : (
                "Register now"
              )}
            </button>
          </form>
        </aside>
      </div>
    </main>
  );
}
