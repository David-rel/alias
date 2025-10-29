"use client";

import { useMemo, useRef, useState } from "react";
import {
  FiCheckCircle,
  FiLoader,
  FiAlertTriangle,
  FiDownload,
} from "react-icons/fi";
import type {
  FormQuestionClientShape,
  FormQuestionChoiceOption,
  FormStatus,
} from "@/types/forms";

type PublicFormRendererProps = {
  form: {
    id: string;
    shareId: string;
    title: string;
    description: string | null;
    submissionMessage: string | null;
    acceptingResponses: boolean;
    status: FormStatus;
    businessName: string | null;
    coverImageUrl: string | null;
  };
  questions: FormQuestionClientShape[];
};

type SubmissionStatus = "idle" | "submitting" | "success" | "error";
type SubmissionState = {
  status: SubmissionStatus;
  message?: string;
};

function ensureOptionValue(label: string, index: number): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

  if (base) {
    return `${base}-${index}`;
  }

  return `option-${index}-${Math.random().toString(36).slice(2, 6)}`;
}

function renderOptions(
  options: FormQuestionChoiceOption[] | undefined,
  fallback: string,
) {
  const provided =
    options && options.length > 0
      ? options
      : [
          {
            label: fallback,
            value: ensureOptionValue(fallback, 0),
          },
        ];

  return provided.map((option, index) => ({
    label: option.label ?? `Option ${index + 1}`,
    value:
      option.value && option.value.length > 0
        ? option.value
        : ensureOptionValue(option.label ?? `Option ${index + 1}`, index),
  }));
}

export function PublicFormRenderer({
  form,
  questions,
}: PublicFormRendererProps) {
  const [submissionState, setSubmissionState] = useState<SubmissionState>({
    status: "idle",
  });
  const submissionComplete = submissionState.status === "success";
  const formRef = useRef<HTMLFormElement | null>(null);

  const booleanFieldKeys = useMemo(
    () =>
      questions
        .filter((question) => question.type === "boolean")
        .map((question) => question.fieldKey),
    [questions],
  );

  const isDraftPreview = form.status === "draft";
  const isAccepting =
    form.status === "active" && form.acceptingResponses === true;
  const showForm = isAccepting || isDraftPreview;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAccepting || submissionState.status === "submitting") {
      return;
    }

    const currentForm = event.currentTarget;
    const data = new FormData(currentForm);

    for (const fieldKey of booleanFieldKeys) {
      const element = currentForm.elements.namedItem(fieldKey);
      if (element && element instanceof HTMLInputElement) {
        data.set(fieldKey, element.checked ? "true" : "false");
      }
    }

    setSubmissionState({ status: "submitting" });

    try {
      const response = await fetch(
        `/api/forms/public/${form.shareId}/responses`,
        {
          method: "POST",
          body: data,
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          payload?.error ?? "We couldn’t submit the form right now.",
        );
      }

      setSubmissionState({ status: "success" });
      currentForm.reset();
    } catch (error) {
      setSubmissionState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong while sending your response.",
      });
    }
  }

  if (submissionComplete) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-[#051831]/95 p-10 text-center text-white shadow-[0_35px_120px_rgba(3,22,45,0.65)] backdrop-blur">
        <FiCheckCircle className="mx-auto text-4xl text-[#23a5fe]" />
        <h1 className="mt-4 text-3xl font-semibold">Thanks for your response!</h1>
        <p className="mt-2 text-sm text-white/70">
          We&apos;ve recorded your submission. You can safely close this tab.
        </p>
        {form.submissionMessage ? (
          <p className="mt-3 text-xs text-white/60">{form.submissionMessage}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-[#051831]/95 p-10 shadow-[0_35px_120px_rgba(3,22,45,0.65)] backdrop-blur">
      <header className="space-y-3 text-white">
        <p className="text-xs uppercase tracking-[0.4em] text-[#3eb6fd]">
          {form.businessName ? `${form.businessName} intake` : "Alias intake"}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {form.title}
        </h1>
        {form.description ? (
          <p className="max-w-2xl text-sm text-white/70">
            {form.description}
          </p>
        ) : null}
      </header>

      {form.coverImageUrl ? (
        <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-white/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={form.coverImageUrl}
            alt={`${form.title} cover`}
            className="h-56 w-full object-cover"
          />
        </div>
      ) : null}

      {!showForm ? (
        <div className="mt-8 rounded-3xl border border-[#23a5fe]/40 bg-[#0d243f] px-6 py-8 text-white/80">
          <div className="flex items-start gap-3">
            <FiAlertTriangle className="mt-1 shrink-0 text-xl text-[#23a5fe]" />
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-white">
                Form unavailable
              </h2>
              <p className="text-sm text-white/70">
                This form is no longer accepting responses. If you believe this is a mistake,
                reach out to the workspace owner for a fresh link.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {isDraftPreview ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-white/75">
          You&apos;re previewing this form while it&apos;s still in draft. Visitors won&apos;t
          be able to submit responses until you mark it live.
        </div>
      ) : null}

      {submissionState.status === "success" ? (
        <div className="mt-8 rounded-2xl border border-[#23a5fe]/40 bg-[#0f2747] px-5 py-4 text-sm text-white/80">
          <div className="flex items-center gap-3">
            <FiCheckCircle className="text-[#23a5fe]" />
            <span>Thanks — your response has been received.</span>
          </div>
          {form.submissionMessage ? (
            <p className="mt-3 text-xs text-white/60">
              {form.submissionMessage}
            </p>
          ) : null}
        </div>
      ) : null}

      {submissionState.status === "error" ? (
        <div className="mt-8 rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-100">
          {submissionState.message}
        </div>
      ) : null}

      {showForm ? (
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="mt-8 space-y-6"
        >
          {questions.map((question) => (
            <div
              key={question.id}
              className="rounded-3xl border border-white/10 bg-[#0a223f] p-6 text-white"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <label
                    htmlFor={question.fieldKey}
                    className="text-sm font-semibold"
                  >
                    {question.label}
                    {question.required ? (
                      <span className="ml-2 text-xs text-[#3eb6fd]">
                        Required
                      </span>
                    ) : null}
                  </label>
                  {question.description ? (
                    <p className="mt-1 text-xs text-white/60">
                      {question.description}
                    </p>
                  ) : null}
                </div>
                <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                  {question.type.replace("_", " ")}
                </span>
              </div>

              <div className="mt-4">
                {(() => {
                  switch (question.type) {
                  case "short_text":
                  case "email": {
                    const type =
                      question.type === "email" ? "email" : "text";
                    return (
                      <input
                        id={question.fieldKey}
                        name={question.fieldKey}
                        type={type}
                        required={question.required}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-[#23a5fe] focus:bg-[#112b4a]"
                        placeholder="Type your answer"
                      />
                    );
                  }
                  case "long_text":
                    return (
                      <textarea
                        id={question.fieldKey}
                        name={question.fieldKey}
                        required={question.required}
                        rows={4}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-[#23a5fe] focus:bg-[#112b4a]"
                        placeholder="Share more context"
                      />
                    );
                  case "number":
                  case "decimal":
                  case "rating":
                    return (
                      <input
                        id={question.fieldKey}
                        name={question.fieldKey}
                        type="number"
                        step={question.type === "decimal" ? "0.01" : "1"}
                        min={
                          question.type === "rating"
                            ? question.settings.validation?.scaleMin ?? 1
                            : undefined
                        }
                        max={
                          question.type === "rating"
                            ? question.settings.validation?.scaleMax ?? 5
                            : undefined
                        }
                        required={question.required}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-[#23a5fe] focus:bg-[#112b4a]"
                        placeholder="0"
                      />
                    );
                  case "boolean":
                    return (
                      <label className="inline-flex items-center gap-3 text-sm text-white/80">
                        <input
                          id={question.fieldKey}
                          name={question.fieldKey}
                          type="checkbox"
                          className="h-5 w-5 rounded border-white/20 bg-white/10 text-[#23a5fe]"
                        />
                        Yes, I agree
                      </label>
                    );
                  case "date":
                    return (
                      <input
                        id={question.fieldKey}
                        name={question.fieldKey}
                        type="date"
                        required={question.required}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-[#23a5fe] focus:bg-[#112b4a]"
                      />
                    );
                  case "time":
                    return (
                      <input
                        id={question.fieldKey}
                        name={question.fieldKey}
                        type="time"
                        required={question.required}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-[#23a5fe] focus:bg-[#112b4a]"
                      />
                    );
                  case "choice_single": {
                    const options = renderOptions(
                      question.settings.options,
                      "Option 1",
                    );
                    return (
                      <div className="grid gap-2">
                        {options.map((option, index) => {
                          const inputId = `${question.fieldKey}-${index}`;
                          return (
                            <label
                              key={option.value}
                              htmlFor={inputId}
                              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:border-[#23a5fe]/60 hover:bg-[#0b2a4a]"
                            >
                              <span>{option.label}</span>
                              <input
                                id={inputId}
                                type="radio"
                                name={question.fieldKey}
                                value={option.value}
                                required={question.required && index === 0}
                                className="h-4 w-4 accent-[#23a5fe]"
                              />
                            </label>
                          );
                        })}
                      </div>
                    );
                  }
                  case "choice_multi": {
                    const options = renderOptions(
                      question.settings.options,
                      "Option 1",
                    );
                    return (
                      <div className="grid gap-2">
                        {options.map((option) => (
                          <label
                            key={option.value}
                            className="inline-flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80"
                          >
                            <span>{option.label}</span>
                            <input
                              type="checkbox"
                              name={question.fieldKey}
                              value={option.value}
                              className="h-5 w-5 rounded border-white/20 bg-white/10 text-[#23a5fe]"
                            />
                          </label>
                        ))}
                      </div>
                    );
                  }
                  case "file":
                    return (
                      <div className="rounded-2xl border border-dashed border-white/20 bg-[#0c2747]/40 px-4 py-6 text-center text-sm text-white/70">
                        <input
                          id={question.fieldKey}
                          name={question.fieldKey}
                          type="file"
                          required={question.required}
                          className="block w-full text-sm text-white/80 file:mr-4 file:rounded-full file:border-0 file:bg-[#23a5fe] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#03162d]"
                        />
                        <p className="mt-3 text-xs text-white/50">
                          Uploads are stored securely on Vercel Blob.
                        </p>
                      </div>
                    );
                  default:
                    return null;
                }
              })()}
            </div>
          </div>
        ))}

        {isAccepting ? (
          <button
            type="submit"
            disabled={submissionState.status === "submitting"}
            className="inline-flex items-center gap-2 rounded-full bg-[#23a5fe] px-6 py-3 text-sm font-semibold text-[#03162d] shadow-[0_20px_60px_rgba(35,165,254,0.45)] transition hover:bg-[#3eb6fd] disabled:cursor-not-allowed disabled:bg-[#1d466c] disabled:text-white/60"
          >
            {submissionState.status === "submitting" ? (
              <>
                <FiLoader className="animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <FiDownload />
                Submit response
              </>
            )}
          </button>
        ) : null}
      </form>
      ) : null}
    </div>
  );
}
