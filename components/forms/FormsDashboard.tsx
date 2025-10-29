"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  FiPlus,
  FiLoader,
  FiArrowRight,
  FiExternalLink,
  FiCopy,
  FiCheckCircle,
} from "react-icons/fi";
import type { FormSummary } from "@/types/forms";
import type { BusinessRole } from "@/types/business";

type FormsDashboardProps = {
  forms: FormSummary[];
  role: BusinessRole;
  shareBaseUrl?: string;
};

function formatDate(date: string | null): string {
  if (!date) {
    return "No submissions yet";
  }

  try {
    const formatter = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    return formatter.format(new Date(date));
  } catch {
    return date;
  }
}

export function FormsDashboard({
  forms: initialForms,
  role,
  shareBaseUrl,
}: FormsDashboardProps) {
  const [forms, setForms] = useState<FormSummary[]>(initialForms);
  const [creating, startCreating] = useTransition();
  const [copySuccessId, setCopySuccessId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const total = forms.length;
    const active = forms.filter((form) => form.status === "active").length;
    const responses = forms.reduce(
      (sum, form) => sum + form.responseCount,
      0,
    );

    return { total, active, responses };
  }, [forms]);

  const canCreate = role === "owner" || role === "admin";

  function resolveShareLink(shareId: string): string {
    if (shareBaseUrl && shareBaseUrl.length > 0) {
      return `${shareBaseUrl.replace(/\/$/, "")}/${shareId}`;
    }

    if (typeof window !== "undefined") {
      return `${window.location.origin}/forms/${shareId}`;
    }

    return `/forms/${shareId}`;
  }

  async function handleCreateForm() {
    if (!canCreate || creating) {
      return;
    }

    startCreating(async () => {
      try {
        const response = await fetch("/api/forms", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: "Untitled form",
            status: "draft",
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create form");
        }

        const payload = (await response.json()) as {
          form: FormSummary & {
            description?: string | null;
            submissionMessage?: string | null;
          };
        };

        setForms((previous) => {
      const next: FormSummary = {
        id: payload.form.id,
        shareId: payload.form.shareId,
        title: payload.form.title,
        status: payload.form.status,
        acceptingResponses: payload.form.acceptingResponses,
        coverImageUrl: payload.form.coverImageUrl ?? null,
        responseCount: payload.form.responseCount ?? 0,
        lastSubmissionAt: payload.form.lastSubmissionAt ?? null,
      };

          return [next, ...previous];
        });
      } catch (error) {
        console.error(error);
      }
    });
  }

  async function handleCopyShareLink(formId: string, shareId: string) {
    const link = resolveShareLink(shareId);

    try {
      await navigator.clipboard.writeText(link);
      setCopySuccessId(formId);
      setTimeout(() => setCopySuccessId((current) => (current === formId ? null : current)), 2500);
    } catch (error) {
      console.error("Failed to copy share link:", error);
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-gradient-to-br from-[#03162d] via-[#052041] to-[#0b3670] p-8 text-white shadow-[0_35px_120px_rgba(3,22,45,0.65)] lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-[#3eb6fd]">
            Signal intake
          </p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Forms command center
          </h1>
          <p className="max-w-2xl text-sm text-white/80">
            Manage every intake workflow from one place. Launch branded forms,
            capture uploads securely, and funnel responses straight into your
            Alias workspace.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCreateForm}
            disabled={!canCreate || creating}
            className="inline-flex items-center gap-2 rounded-full bg-[#23a5fe] px-5 py-3 text-sm font-semibold text-[#03162d] shadow-[0_18px_45px_rgba(35,165,254,0.45)] transition hover:scale-[1.01] hover:bg-[#3eb6fd] disabled:cursor-not-allowed disabled:bg-[#1d466c] disabled:text-white/50"
          >
            {creating ? (
              <>
                <FiLoader className="animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <FiPlus />
                New form
              </>
            )}
          </button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg transition hover:border-[#3eb6fd]/60 hover:shadow-[0_20px_60px_rgba(8,20,38,0.45)]">
          <p className="text-xs uppercase tracking-[0.3em] text-[#3eb6fd]">
            Total forms
          </p>
          <p className="mt-3 text-3xl font-semibold text-white">{stats.total}</p>
          <p className="mt-2 text-xs text-white/60">
            Every form active or archived inside your workspace.
          </p>
        </article>
        <article className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg transition hover:border-[#3eb6fd]/60 hover:shadow-[0_20px_60px_rgba(8,20,38,0.45)]">
          <p className="text-xs uppercase tracking-[0.3em] text-[#3eb6fd]">
            Active funnels
          </p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {stats.active}
          </p>
          <p className="mt-2 text-xs text-white/60">
            Live forms currently collecting responses.
          </p>
        </article>
        <article className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg transition hover:border-[#3eb6fd]/60 hover:shadow-[0_20px_60px_rgba(8,20,38,0.45)]">
          <p className="text-xs uppercase tracking-[0.3em] text-[#3eb6fd]">
            Captured answers
          </p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {stats.responses}
          </p>
          <p className="mt-2 text-xs text-white/60">
            Total submissions across every form.
          </p>
        </article>
        <article className="rounded-3xl border border-white/10 bg-[#0f2747] p-6 text-white transition hover:border-[#3eb6fd]/60 hover:shadow-[0_20px_60px_rgba(8,20,38,0.45)]">
          <p className="text-xs uppercase tracking-[0.3em] text-[#3eb6fd]">
            How it works
          </p>
          <p className="mt-3 text-sm text-white/80">
            Build your form, drop the share link anywhere, and Alias routes every
            submission into your analytics and automations.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#3eb6fd]">
            Explore workflow
            <FiArrowRight />
          </div>
        </article>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-white">
            All forms
          </h2>
          <span className="text-xs uppercase tracking-[0.3em] text-white/60">
            {forms.length} experiences
          </span>
        </div>

        {forms.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-white/20 bg-white/5 px-10 py-16 text-center text-white/70">
            <p className="text-lg font-semibold text-white">
              No forms yet
            </p>
            <p className="max-w-md text-sm">
              Ship your first intake experience to unlock analytics, attachments,
              and automated routing.
            </p>
            <button
              type="button"
              onClick={handleCreateForm}
              disabled={!canCreate || creating}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-[#3eb6fd]/60 hover:bg-[#0b2a4a] disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/40"
            >
              <FiPlus />
              Launch a form
            </button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {forms.map((form) => {
              const shareLink = resolveShareLink(form.shareId);
              const statusBadge =
                form.status === "active"
                  ? "text-emerald-300 bg-emerald-500/10 border-emerald-400/30"
                  : form.status === "draft"
                    ? "text-amber-200 bg-amber-500/10 border-amber-300/30"
                    : "text-white/70 bg-white/10 border-white/15";

              return (
                <article
                  key={form.id}
                  className="group flex h-full flex-col justify-between rounded-3xl border border-white/10 bg-gradient-to-br from-[#03162d] via-[#071f3c] to-[#0b3670] p-6 text-white shadow-[0_28px_80px_rgba(3,22,45,0.6)] transition hover:border-[#3eb6fd]/60 hover:shadow-[0_45px_120px_rgba(4,29,60,0.7)]"
                >
                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                      {form.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={form.coverImageUrl}
                          alt={`${form.title || "Form"} cover`}
                          className="h-32 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="flex h-32 items-center justify-center text-xs text-white/50">
                          No cover image
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusBadge}`}
                      >
                        <span className="inline-block h-2 w-2 rounded-full bg-current" />
                        {form.status}
                      </span>
                      <span className="text-xs text-white/60">
                        {form.acceptingResponses
                          ? "Accepting responses"
                          : "Closed"}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold tracking-tight">
                        {form.title || "Untitled form"}
                      </h3>
                      <p className="mt-2 text-sm text-white/70">
                        {formatDate(form.lastSubmissionAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-white/70">
                      <div>
                        <p className="text-2xl font-semibold text-white">
                          {form.responseCount}
                        </p>
                        <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                          responses
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <Link
                      href={`/app/forms/${form.id}`}
                      className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-[#03162d] transition hover:bg-white"
                    >
                      Manage form
                      <FiExternalLink />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleCopyShareLink(form.id, form.shareId)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-[#3eb6fd]/60 hover:bg-[#0b2a4a]"
                    >
                      {copySuccessId === form.id ? (
                        <>
                          <FiCheckCircle />
                          Copied
                        </>
                      ) : (
                        <>
                          <FiCopy />
                          Copy share link
                        </>
                      )}
                    </button>
                    <p className="w-full truncate text-xs text-white/50">
                      {shareLink}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
