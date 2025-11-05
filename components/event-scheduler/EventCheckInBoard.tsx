"use client";

import { useMemo, useState, useTransition } from "react";
import {
  FiCheck,
  FiCheckCircle,
  FiLoader,
  FiRefreshCcw,
  FiUser,
  FiXCircle,
} from "react-icons/fi";
import type {
  EventRegistration,
  EventWithStats,
} from "@/types/events";

type EventCheckInBoardProps = {
  event: EventWithStats;
  initialRegistrations: EventRegistration[];
};

function computeMetrics(
  event: EventWithStats,
  registrations: EventRegistration[],
) {
  const checkedIn = registrations.filter(
    (registration) => registration.status === "checked_in",
  ).length;
  const active = registrations.filter((registration) =>
    registration.status === "registered" || registration.status === "checked_in",
  ).length;
  const remaining =
    event.capacity === null
      ? null
      : Math.max(event.capacity - active, 0);

  return {
    checkedIn,
    active,
    remaining,
    total: registrations.length,
  };
}

export function EventCheckInBoard({
  event,
  initialRegistrations,
}: EventCheckInBoardProps) {
  const [eventSnapshot, setEventSnapshot] = useState<EventWithStats>(event);
  const [registrations, setRegistrations] =
    useState<EventRegistration[]>(initialRegistrations);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, startRefresh] = useTransition();

  const metrics = useMemo(
    () => computeMetrics(eventSnapshot, registrations),
    [eventSnapshot, registrations],
  );

  function setPending(registrationId: string, nextPending: boolean) {
    setPendingIds((current) =>
      nextPending
        ? [...current, registrationId]
        : current.filter((id) => id !== registrationId),
    );
  }

  async function handleToggleCheckIn(
    registrationId: string,
    checked: boolean,
  ) {
    setError(null);
    setMessage(null);
    setPending(registrationId, true);

    try {
      const response = await fetch(
        `/api/event-scheduler/events/${eventSnapshot.id}/registrations/${registrationId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ checkedIn: checked }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Unable to update check-in status");
      }

      const payload = (await response.json()) as {
        registration: EventRegistration;
      };

      setRegistrations((current) =>
        current.map((registration) =>
          registration.id === registrationId
            ? payload.registration
            : registration,
        ),
      );

      setMessage(
        checked
          ? "Attendee checked in successfully."
          : "Check-in undone.",
      );
    } catch (updateError) {
      setError((updateError as Error).message);
    } finally {
      setPending(registrationId, false);
    }
  }

  function handleRefresh() {
    startRefresh(async () => {
      setError(null);
      setMessage(null);
      try {
        const response = await fetch(
          `/api/event-scheduler/events/${eventSnapshot.id}`,
        );
        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error ?? "Unable to refresh registrations");
        }
        const payload = (await response.json()) as {
          event: EventWithStats;
          registrations: EventRegistration[];
        };
        setEventSnapshot(payload.event);
        setRegistrations(payload.registrations);
      } catch (refreshError) {
        setError((refreshError as Error).message);
      }
    });
  }

  return (
    <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_45px_120px_rgba(3,22,45,0.45)] text-white">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Check-in desk</h2>
          <p className="text-xs text-white/60">
            Tap an attendee to confirm arrival. Changes sync instantly across the dashboard.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:border-[#3eb6fd]/60 hover:bg-[#062951] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {refreshing ? (
            <FiLoader className="animate-spin" />
          ) : (
            <FiRefreshCcw />
          )}
          Refresh
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
          <div className="text-xs uppercase tracking-[0.35em] text-white/50">
            Registered
          </div>
          <div className="mt-2 flex items-center gap-2 text-lg font-semibold">
            <FiUser className="text-[#3eb6fd]" />
            {metrics.total}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
          <div className="text-xs uppercase tracking-[0.35em] text-white/50">
            Active seats
          </div>
          <div className="mt-2 flex items-center gap-2 text-lg font-semibold">
            <FiUser className="text-[#3eb6fd]" />
            {metrics.active}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
          <div className="text-xs uppercase tracking-[0.35em] text-white/50">
            Checked in
          </div>
          <div className="mt-2 flex items-center gap-2 text-lg font-semibold">
            <FiCheckCircle className="text-emerald-300" />
            {metrics.checkedIn}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
          <div className="text-xs uppercase tracking-[0.35em] text-white/50">
            Spots left
          </div>
          <div className="mt-2 flex items-center gap-2 text-lg font-semibold">
            <FiUser className="text-[#3eb6fd]" />
            {metrics.remaining === null ? "Unlimited" : metrics.remaining}
          </div>
        </div>
      </div>

      {message ? (
        <div className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-xs text-emerald-100">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-[#ff6b6b]/40 bg-[#ff6b6b]/10 px-4 py-3 text-xs text-[#ffb4b4]">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {registrations.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/10 bg-white/5 py-12 text-center text-white/60">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#3eb6fd]/40 bg-[#23a5fe]/10 text-[#3eb6fd]">
              <FiUser className="text-xl" />
            </div>
            <p className="text-sm text-white/70">
              Once people register they will appear here for quick check-ins.
            </p>
          </div>
        ) : (
          registrations.map((registration) => {
            const pending = pendingIds.includes(registration.id);
            const checkedIn = registration.status === "checked_in";
            const registeredAt = new Date(registration.createdAt).toLocaleString(
              "en-US",
              { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
            );
            const checkedInAt = registration.checkedInAt
              ? new Date(registration.checkedInAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })
              : null;

            return (
              <div
                key={registration.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{registration.attendeeName}</p>
                    <p className="text-xs text-white/50">{registration.attendeeEmail}</p>
                    {registration.attendeePhone ? (
                      <p className="text-xs text-white/40">{registration.attendeePhone}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleCheckIn(registration.id, !checkedIn)}
                    disabled={pending}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                      checkedIn
                        ? "border-emerald-400/60 bg-emerald-400/20 text-emerald-100 hover:bg-emerald-400/30"
                        : "border-white/15 bg-white/10 text-white hover:border-[#3eb6fd]/60 hover:bg-[#062951]"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {pending ? (
                      <FiLoader className="animate-spin" />
                    ) : checkedIn ? (
                      <>
                        <FiXCircle /> Undo
                      </>
                    ) : (
                      <>
                        <FiCheck /> Check in
                      </>
                    )}
                  </button>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60">
                  <p>
                    Registered: <span className="text-white/80">{registeredAt}</span>
                  </p>
                  <p>
                    Check-in:{" "}
                    <span className="text-white/80">
                      {checkedInAt ?? "Not yet"}
                    </span>
                  </p>
                </div>
                {registration.notes ? (
                  <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
                    {registration.notes}
                  </p>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
