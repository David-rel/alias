"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  FiCheck,
  FiClock,
  FiGlobe,
  FiLoader,
  FiMail,
  FiUser,
} from "react-icons/fi";
import type {
  AppointmentCalendar,
  AppointmentBooking,
  DayAvailability,
} from "@/types/appointments";

type PublicBookingExperienceProps = {
  calendar: AppointmentCalendar;
  availability: DayAvailability[];
};

function renderSlotLabel(slot: { start: string; end: string }, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  });
  return `${formatter.format(new Date(slot.start))} - ${formatter.format(new Date(slot.end))}`;
}

function renderDayLabel(date: string, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  return formatter.format(new Date(`${date}T00:00:00`));
}

function summarizeLocation(calendar: AppointmentCalendar): string {
  switch (calendar.locationType) {
    case "in_person":
      return calendar.locationDetails ?? "In-person meeting";
    case "virtual": {
      const label = calendar.virtualMeetingPreference
        ? `${calendar.virtualMeetingPreference}`
        : "Virtual meeting";
      if (calendar.locationDetails) {
        return `${label} · ${calendar.locationDetails}`;
      }
      return label;
    }
    case "phone":
      return calendar.locationDetails ?? "Phone call";
    default:
      return calendar.locationDetails ?? "Custom instructions to follow";
  }
}

export function PublicBookingExperience({ calendar, availability }: PublicBookingExperienceProps) {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [availableDays, setAvailableDays] = useState<DayAvailability[]>(availability);
  const [completedBooking, setCompletedBooking] = useState<AppointmentBooking | null>(null);
  const [pending, startBooking] = useTransition();
  const viewerTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone ?? calendar.timezone;
    } catch {
      return calendar.timezone;
    }
  }, [calendar.timezone]);

  useEffect(() => {
    setAvailableDays(availability);
  }, [availability]);

  const days = useMemo(() => availableDays.slice(0, 14), [availableDays]);
  const selectedDay = days[selectedDayIndex] ?? days[0] ?? null;
  const selectedSlot = selectedDay
    ? selectedDay.slots[selectedSlotIndex ?? -1] ?? null
    : null;

  async function handleConfirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("idle");
    setErrorMessage(null);

    if (!selectedDay || !selectedSlot) {
      setErrorMessage("Choose a time to continue.");
      return;
    }

    startBooking(async () => {
      try {
        const response = await fetch(
          `/api/appointment-scheduler/public/${calendar.shareId}/bookings`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
              body: JSON.stringify({
                guestName: name,
                guestEmail: email,
                guestTimezone: viewerTimezone,
                guestNotes: notes,
                slotStart: selectedSlot.start,
                slotEnd: selectedSlot.end,
              }),
            },
        );

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error ?? "Unable to confirm booking");
        }

        const payload = (await response.json()) as {
          booking: AppointmentBooking;
          availability: DayAvailability[];
        };

        setCompletedBooking(payload.booking);
        setAvailableDays(payload.availability);
        setStatus("success");
      } catch (error) {
        setStatus("error");
        setErrorMessage((error as Error).message);
      }
    });
  }

  if (status === "success" && completedBooking) {
    const slotLabel = renderSlotLabel(
      { start: completedBooking.startTime, end: completedBooking.endTime },
      calendar.timezone,
    );
    const dateLabel = new Intl.DateTimeFormat("en-US", {
      timeZone: calendar.timezone,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(completedBooking.startTime));
    const locationSummary = summarizeLocation(calendar);
    const guestNotes = completedBooking.guestNotes ?? null;
    const showJoinLink =
      completedBooking.status === "scheduled" &&
      completedBooking.meetingUrl;
    const localDateLabel = new Intl.DateTimeFormat("en-US", {
      timeZone: viewerTimezone,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(completedBooking.startTime));
    const localSlotLabel = renderSlotLabel(
      { start: completedBooking.startTime, end: completedBooking.endTime },
      viewerTimezone,
    );

    return (
      <main className="min-h-screen bg-linear-to-br from-[#f5f9ff] via-white to-[#e9f3ff]">
        <section className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-[#23a5fe]/20 text-[#0064d6] shadow-[0_14px_45px_rgba(0,100,214,0.25)]">
            <FiCheck className="text-3xl" />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-[#03162d]">
              You&apos;re booked!
            </h1>
            <p className="text-sm text-[#0f2747]">
              {completedBooking.status === "pending"
                ? (
                  <>
                    Your request is being reviewed. We&apos;ll email <strong>{completedBooking.guestEmail}</strong> once it&apos;s approved.
                  </>
                )
                : (
                  <>
                    A confirmation email is on its way to <strong>{completedBooking.guestEmail}</strong>. We&apos;ll send any updates there too.
                  </>
                )}
            </p>
          </div>
          <div className="w-full space-y-4 rounded-3xl border border-[#cde6ff] bg-white p-6 text-left shadow-[0_24px_70px_rgba(15,35,67,0.12)]">
            <div className="flex flex-col gap-1 text-sm text-[#0f2747]">
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-[#0064d6]">
                {calendar.name}
              </span>
              <span className="text-lg font-semibold text-[#03162d]">{dateLabel}</span>
              <span>{slotLabel}</span>
            </div>
            <div className="rounded-2xl bg-[#f6fbff] px-4 py-3 text-sm text-[#0f2747]">
              <p className="m-0 font-semibold">Where</p>
              <p className="m-0">{locationSummary}</p>
              {showJoinLink ? (
                <p className="mt-2">
                  <a
                    href={completedBooking.meetingUrl ?? undefined}
                    className="text-[#0064d6] underline"
                  >
                    Join meeting link
                  </a>
                </p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-[#cde6ff]/60 bg-white px-4 py-3 text-xs text-[#0f2747]/80">
              <p className="m-0 font-semibold">Your local time ({viewerTimezone})</p>
              <p className="m-0">{localDateLabel}</p>
              <p className="m-0">{localSlotLabel}</p>
            </div>
            {guestNotes ? (
              <div className="rounded-2xl bg-[#fef3c7] px-4 py-3 text-sm text-[#92400e]">
                <p className="m-0 font-semibold">Notes you shared</p>
                <p className="m-0">{guestNotes}</p>
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setStatus("idle");
                setCompletedBooking(null);
                setSelectedSlotIndex(null);
                setSelectedDayIndex(0);
                setName("");
                setEmail("");
                setNotes("");
                setErrorMessage(null);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-[#cde6ff] bg-white px-5 py-3 text-sm font-semibold text-[#0064d6] transition hover:border-[#23a5fe] hover:bg-[#e2f3ff]"
            >
              Book another time
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!selectedDay) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <h1 className="text-3xl font-semibold text-[#0e58b1]">No open slots</h1>
        <p className="text-sm text-neutral-600">
          This calendar currently has no availability. Check back soon or reach out to the team to coordinate manually.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-linear-to-br from-[#f5f9ff] via-white to-[#e9f3ff]">
      <section className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 lg:flex-row">
        <div className="lg:w-2/5 space-y-6">
          <div className="rounded-3xl border border-[#cde6ff] bg-white p-6 shadow-[0_30px_80px_rgba(15,35,67,0.08)]">
            <p className="text-xs uppercase tracking-[0.35em] text-[#0064d6]">
              {calendar.appointmentType}
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-[#03162d]">
              {calendar.name}
            </h1>
            {calendar.description ? (
              <p className="mt-3 text-sm text-[#0f2747]">{calendar.description}</p>
            ) : null}
            <div className="mt-6 space-y-3 text-sm text-[#0f2747]">
              <p className="inline-flex items-center gap-2 rounded-2xl border border-[#cde6ff] bg-[#f1f7ff] px-3 py-2">
                <FiClock className="text-[#0064d6]" /> {calendar.durationMinutes} minute meeting
              </p>
              <p className="inline-flex items-center gap-2 rounded-2xl border border-[#cde6ff] bg-[#f1f7ff] px-3 py-2">
                <FiGlobe className="text-[#0064d6]" /> Hosted in {calendar.timezone}
              </p>
            </div>
            <div className="mt-4 space-y-3 text-sm text-[#0f2747]">
              <div className="rounded-2xl border border-[#cde6ff] bg-white px-4 py-3">
                <p className="m-0 text-xs font-semibold uppercase tracking-[0.3em] text-[#0064d6]">
                  How you&apos;ll meet
                </p>
                <p className="mt-2 mb-0">{summarizeLocation(calendar)}</p>
              </div>
              <div className="rounded-2xl border border-[#cde6ff]/70 bg-white px-4 py-3 text-xs text-[#0f2747]/80">
                <p className="m-0">
                  All slots show in <strong>{calendar.timezone}</strong>. We&apos;ll include your local time ({viewerTimezone}) in the confirmation.
                </p>
              </div>
              {calendar.requiresConfirmation ? (
                <div className="rounded-2xl border border-[#fcd34d] bg-[#fef3c7] px-4 py-3 text-xs text-[#92400e]">
                  <p className="m-0 font-semibold">Manual approval required</p>
                  <p className="m-0">
                    Your request is reviewed by the team before it&apos;s confirmed. Expect a follow-up once it&apos;s approved.
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-[#0064d6]">
              Pick a day
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {days.map((day, index) => (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => {
                    setSelectedDayIndex(index);
                    setSelectedSlotIndex(null);
                  }}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    index === selectedDayIndex
                      ? "border-[#23a5fe] bg-[#e2f3ff] text-[#03162d] shadow-[0_18px_40px_rgba(35,165,254,0.25)]"
                      : "border-[#d7e6f7] bg-white text-[#0f2747] hover:border-[#23a5fe]/70"
                  }`}
                >
                  <p className="font-semibold">{renderDayLabel(day.date, calendar.timezone)}</p>
                  <p className="text-xs text-[#0f2747]/70">{day.slots.length} slots</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-[#0064d6]">
              Available times
            </h2>
            <p className="text-xs text-[#0f2747]/70">
              Pick any opening that suits you. Booked times lock in {calendar.timezone} and your email will include the conversion for {viewerTimezone}.
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedDay.slots.map((slot, index) => (
                <button
                  key={slot.start}
                  type="button"
                  onClick={() => setSelectedSlotIndex(index)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    index === selectedSlotIndex
                      ? "border-[#0064d6] bg-[#0064d6] text-white"
                      : "border-[#cde6ff] bg-white text-[#0f2747] hover:border-[#0064d6]"
                  }`}
                >
                  {renderSlotLabel(slot, calendar.timezone)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:w-3/5">
          <form
            onSubmit={handleConfirm}
            className="space-y-6 rounded-3xl border border-[#cde6ff] bg-white p-8 shadow-[0_30px_80px_rgba(15,35,67,0.08)]"
          >
            <header className="space-y-2">
              <h2 className="text-2xl font-semibold text-[#03162d]">
                Tell us who well meet
              </h2>
              <p className="text-sm text-[#0f2747]">
                Add your details so we can send confirmation and reminders.
              </p>
            </header>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-[#0f2747]">
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#0064d6]">
                  <FiUser /> Your name
                </span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  placeholder="Jordan Smith"
                  className="rounded-2xl border border-[#cde6ff] bg-white px-4 py-3 text-sm text-[#03162d] focus:border-[#23a5fe] focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-[#0f2747]">
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#0064d6]">
                  <FiMail /> Work email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  placeholder="you@company.com"
                  className="rounded-2xl border border-[#cde6ff] bg-white px-4 py-3 text-sm text-[#03162d] focus:border-[#23a5fe] focus:outline-none"
                />
              </label>
            </div>
            <label className="flex flex-col gap-2 text-sm text-[#0f2747]">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#0064d6]">
                Notes for the team
              </span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Share context or goals for this meeting."
                className="rounded-2xl border border-[#cde6ff] bg-white px-4 py-3 text-sm text-[#03162d] focus:border-[#23a5fe] focus:outline-none"
              />
            </label>

            {selectedDay && selectedSlot ? (
              <div className="rounded-2xl border border-[#23a5fe]/40 bg-[#e2f3ff] px-4 py-3 text-sm text-[#03162d]">
                <p className="font-semibold">You selected</p>
                <p>
                  {renderDayLabel(selectedDay.date, calendar.timezone)} · {renderSlotLabel(selectedSlot, calendar.timezone)}
                </p>
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-[#cde6ff] bg-[#f6fbff] px-4 py-3 text-sm text-[#0f2747]">
                Choose a time from the left to continue.
              </p>
            )}

            {errorMessage ? (
              <p className="rounded-2xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-600">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0064d6] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(0,100,214,0.35)] transition hover:scale-[1.01] hover:bg-[#0052af] disabled:cursor-not-allowed disabled:bg-[#9dbdea]"
            >
              {pending ? (
                <>
                  <FiLoader className="animate-spin" /> Scheduling…
                </>
              ) : (
                "Confirm booking"
              )}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
