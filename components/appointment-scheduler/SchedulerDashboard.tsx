"use client";

import { useMemo, useState, useTransition } from "react";
import {
  FiArrowRight,
  FiCalendar,
  FiClock,
  FiLoader,
  FiMapPin,
  FiPlus,
  FiRefreshCcw,
} from "react-icons/fi";
import type { BusinessRole } from "@/types/business";
import type {
  AppointmentCalendar,
  CalendarSummary,
} from "@/types/appointments";
import { CalendarCard } from "./CalendarCard";
import { CreateCalendarForm } from "./CreateCalendarForm";

type SchedulerDashboardProps = {
  calendars: CalendarSummary[];
  role: BusinessRole;
  shareBaseUrl?: string;
};

export function SchedulerDashboard({ calendars: initialCalendars, role, shareBaseUrl }: SchedulerDashboardProps) {
  const [calendars, setCalendars] = useState<CalendarSummary[]>(initialCalendars);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [refreshing, startRefresh] = useTransition();

  const stats = useMemo(() => {
    const total = calendars.length;
    const active = calendars.filter((calendar) => calendar.status === "active").length;
    const synced = calendars.filter((calendar) => calendar.googleCalendarSync).length;
    const totalBookings = calendars.reduce(
      (sum, calendar) => sum + calendar.upcomingBookings.length,
      0,
    );

    return { total, active, synced, totalBookings };
  }, [calendars]);

  const canCreate = role === "owner" || role === "admin";

  function handleCreated(calendar: AppointmentCalendar) {
    const summary: CalendarSummary = {
      ...calendar,
      upcomingAvailability: [],
      upcomingBookings: [],
    };

    setCalendars((current) => [summary, ...current]);
    setDrawerOpen(false);
  }

  function handleRefresh() {
    if (refreshing) {
      return;
    }

    startRefresh(async () => {
      try {
        const response = await fetch("/api/appointment-scheduler/calendars");
        if (!response.ok) {
          throw new Error("Failed to refresh calendars");
        }
        const payload = (await response.json()) as { calendars: CalendarSummary[] };
        setCalendars(payload.calendars);
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
              Booking orchestration
            </p>
            <h1 className="text-4xl font-semibold tracking-tight">
              Appointment scheduler
            </h1>
            <p className="max-w-2xl text-sm text-white/75">
              Publish polished booking pages, enforce buffers automatically, and keep every confirmed meeting in lockstep with Google Calendar.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-white/70">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
                <FiCalendar /> {stats.total} calendars
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
                <FiClock /> {stats.totalBookings} upcoming bookings
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
                <FiMapPin /> {stats.active} active
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
              {refreshing ? <FiLoader className="animate-spin" /> : <FiRefreshCcw />} Refresh
            </button>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              disabled={!canCreate}
              className="inline-flex items-center gap-2 rounded-full bg-[#23a5fe] px-6 py-3 text-sm font-semibold text-[#03162d] shadow-[0_18px_45px_rgba(35,165,254,0.45)] transition hover:scale-[1.01] hover:bg-[#3eb6fd] disabled:cursor-not-allowed disabled:bg-[#1d466c] disabled:text-white/50"
            >
              <FiPlus /> New calendar
            </button>
            {!canCreate ? (
              <p className="text-xs text-white/50">Only admins and owners can create calendars.</p>
            ) : null}
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {calendars.length > 0 ? (
          calendars.map((calendar) => (
            <CalendarCard
              key={calendar.id}
              calendar={calendar}
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
                No calendars yet
              </h2>
              <p className="text-sm text-white/60">
                Launch your first booking flow to let clients claim time on your terms.
              </p>
            </div>
            {canCreate ? (
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-[#23a5fe] px-6 py-3 text-sm font-semibold text-[#03162d] shadow-[0_18px_45px_rgba(35,165,254,0.45)] transition hover:scale-[1.01] hover:bg-[#3eb6fd]"
              >
                <FiPlus /> Create calendar
              </button>
            ) : null}
          </div>
        )}
      </section>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-10">
          <div className="relative w-full max-w-3xl">
            <div className="absolute -top-5 right-0 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:border-white/40"
              >
                Close
                <FiArrowRight />
              </button>
            </div>
            <CreateCalendarForm
              onCreated={(calendar) => handleCreated(calendar as CalendarSummary)}
              onCancel={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
