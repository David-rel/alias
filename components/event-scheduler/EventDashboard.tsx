"use client";

import { useMemo, useState, useTransition } from "react";
import {
  FiCalendar,
  FiCheckCircle,
  FiLoader,
  FiPlus,
  FiRefreshCcw,
  FiUsers,
} from "react-icons/fi";
import type { BusinessRole } from "@/types/business";
import type { Event, EventWithStats } from "@/types/events";
import { EventCard } from "./EventCard";
import { CreateEventForm } from "./CreateEventForm";

type EventDashboardProps = {
  events: EventWithStats[];
  role: BusinessRole;
  shareBaseUrl?: string;
};

function toSummary(event: Event): EventWithStats {
  return {
    ...event,
    registrationCount: 0,
    checkedInCount: 0,
    capacityRemaining: event.capacity,
  };
}

export function EventDashboard({
  events: initialEvents,
  role,
  shareBaseUrl,
}: EventDashboardProps) {
  const [events, setEvents] = useState<EventWithStats[]>(initialEvents);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [refreshing, startRefresh] = useTransition();

  const stats = useMemo(() => {
    const total = events.length;
    const now = new Date();
    const upcoming = events.filter(
      (event) =>
        event.status === "published" && new Date(event.startTime) > now,
    ).length;
    const totalRegistrations = events.reduce(
      (acc, event) => acc + event.registrationCount,
      0,
    );
    const totalCheckedIn = events.reduce(
      (acc, event) => acc + event.checkedInCount,
      0,
    );

    return {
      total,
      upcoming,
      totalRegistrations,
      totalCheckedIn,
    };
  }, [events]);

  const canCreate = role === "owner" || role === "admin";

  function handleCreated(event: Event) {
    setEvents((current) => [toSummary(event), ...current]);
    setDrawerOpen(false);
  }

  function handleRefresh() {
    if (refreshing) {
      return;
    }

    startRefresh(async () => {
      try {
        const response = await fetch("/api/event-scheduler/events");
        if (!response.ok) {
          throw new Error("Unable to refresh events");
        }
        const payload = (await response.json()) as {
          events: EventWithStats[];
        };
        setEvents(payload.events);
      } catch (error) {
        console.error(error);
      }
    });
  }

  return (
    <div className="space-y-10">
      <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#03162d] via-[#052041] to-[#0b3670] p-8 text-white shadow-[0_60px_160px_rgba(3,22,45,0.6)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.45em] text-[#3eb6fd]">
              Event orchestration
            </p>
            <h1 className="text-4xl font-semibold tracking-tight">
              Event scheduler
            </h1>
            <p className="max-w-2xl text-sm text-white/75">
              Publish polished landing pages, cap attendance, and keep every
              attendee in sync from registration to check-in.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-white/70">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
                <FiCalendar /> {stats.total} total events
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
                <FiCalendar /> {stats.upcoming} upcoming
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
                <FiUsers /> {stats.totalRegistrations} registrants
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
                <FiCheckCircle /> {stats.totalCheckedIn} check-ins
              </span>
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:border-[#3eb6fd]/60 hover:bg-[#062951] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing ? (
                <FiLoader className="animate-spin" />
              ) : (
                <FiRefreshCcw />
              )}
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              disabled={!canCreate}
              className="inline-flex items-center gap-2 rounded-full bg-[#23a5fe] px-6 py-3 text-sm font-semibold text-[#03162d] shadow-[0_18px_45px_rgba(35,165,254,0.45)] transition hover:scale-[1.01] hover:bg-[#3eb6fd] disabled:cursor-not-allowed disabled:bg-[#1d466c] disabled:text-white/50"
            >
              <FiPlus /> New event
            </button>
            {!canCreate ? (
              <p className="text-xs text-white/50">
                Only admins and owners can publish events.
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {events.length > 0 ? (
          events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              shareBaseUrl={shareBaseUrl}
            />
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center gap-5 rounded-3xl border border-dashed border-white/15 bg-white/5 py-16 text-center text-white/60">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#3eb6fd]/50 bg-[#23a5fe]/10 text-[#3eb6fd]">
              <FiCalendar className="text-2xl" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white">
                No events yet
              </h2>
              <p className="text-sm text-white/60">
                Launch your first experience to start collecting registrations.
              </p>
            </div>
            {canCreate ? (
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-[#23a5fe] px-6 py-3 text-sm font-semibold text-[#03162d] shadow-[0_18px_45px_rgba(35,165,254,0.45)] transition hover:scale-[1.01] hover:bg-[#3eb6fd]"
              >
                <FiPlus /> Create event
              </button>
            ) : null}
          </div>
        )}
      </section>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-10">
          <div className="w-full max-w-3xl py-6">
            <CreateEventForm
              onCreated={handleCreated}
              onCancel={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
