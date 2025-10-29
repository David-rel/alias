"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
} from "react";
import Link from "next/link";
import {
  FiCopy,
  FiCheckCircle,
  FiLoader,
  FiTrash2,
  FiRefreshCw,
  FiPlus,
  FiEdit3,
  FiAlertCircle,
  FiInbox,
  FiActivity,
  FiEye,
  FiUploadCloud,
  FiChevronDown,
  FiBarChart2,
  FiList,
  FiDownload,
  FiArrowLeft,
} from "react-icons/fi";
import { PublicFormRenderer } from "@/components/forms/PublicFormRenderer";
import type { BusinessRole } from "@/types/business";
import type {
  FormQuestionClientShape,
  FormQuestionChoiceOption,
  FormQuestionType,
  FormResponseRecord,
} from "@/types/forms";
import type { FormStatus } from "@/types/forms";

type FormAnswerRecord = FormResponseRecord["answers"][number];

const QUESTION_TYPES: Array<{ value: FormQuestionType; label: string }> = [
  { value: "short_text", label: "Short text" },
  { value: "long_text", label: "Long text" },
  { value: "email", label: "Email" },
  { value: "number", label: "Number" },
  { value: "decimal", label: "Decimal" },
  { value: "boolean", label: "Yes / No" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "choice_single", label: "Single select" },
  { value: "choice_multi", label: "Multi select" },
  { value: "file", label: "File upload" },
  { value: "rating", label: "Rating scale" },
];

const PIE_COLORS = [
  "#23a5fe",
  "#3eb6fd",
  "#0064d6",
  "#49d5ff",
  "#82e0ff",
  "#1b7ddb",
  "#0f2747",
];

const STATUS_OPTIONS: Array<{ value: FormStatus; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Live" },
  { value: "archived", label: "Archived" },
];

const isChoiceType = (type: FormQuestionType) =>
  type === "choice_single" || type === "choice_multi";

const slugify = (input: string) =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

function ensureOptionValue(label: string): string {
  const base = slugify(label);
  if (base) {
    return base;
  }
  return `option-${Math.random().toString(36).slice(2, 8)}`;
}

type FormWorkspaceProps = {
  form: {
    id: string;
    shareId: string;
    title: string;
    description: string | null;
    status: FormStatus;
    acceptingResponses: boolean;
    submissionMessage: string | null;
    coverImageUrl: string | null;
    createdAt: string;
    updatedAt: string;
    responseCount: number;
    lastSubmissionAt: string | null;
  };
  questions: FormQuestionClientShape[];
  responses: FormResponseRecord[];
  summary: {
    total: number;
    submitted: number;
    flagged: number;
    spam: number;
    deleted: number;
  };
  role: BusinessRole;
  shareBaseUrl?: string;
};

type NewQuestionState = {
  label: string;
  type: FormQuestionType;
  description: string;
  required: boolean;
  options: string[];
};

function formatDateTime(input: string | null): string {
  if (!input) {
    return "Never";
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(input));
  } catch {
    return input;
  }
}

function formatFileSize(size: number | null): string {
  if (!size) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB"];
  let currentSize = size;
  let unitIndex = 0;
  while (currentSize >= 1024 && unitIndex < units.length - 1) {
    currentSize /= 1024;
    unitIndex += 1;
  }
  return `${currentSize.toFixed(1)} ${units[unitIndex]}`;
}

export function FormWorkspace({
  form,
  questions: initialQuestions,
  responses: initialResponses,
  summary: initialSummary,
  role,
  shareBaseUrl,
}: FormWorkspaceProps) {
  const [formState, setFormState] = useState(form);
  const [questions, setQuestions] =
    useState<FormQuestionClientShape[]>(initialQuestions);
  const [responses, setResponses] =
    useState<FormResponseRecord[]>(initialResponses);
  const [summary, setSummary] = useState(initialSummary);
  const [activeTab, setActiveTab] = useState<"questions" | "responses">("questions");
  const [questionView, setQuestionView] = useState<"builder" | "preview">("builder");
  const [responsesView, setResponsesView] = useState<"list" | "analytics">("list");
  const [savingForm, setSavingForm] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [creatingQuestion, setCreatingQuestion] = useState(false);
  const [newQuestion, setNewQuestion] = useState<NewQuestionState>({
    label: "",
    type: "short_text",
    description: "",
    required: false,
    options: ["Option 1", "Option 2"],
  });
  const [questionLoading, setQuestionLoading] = useState<string | null>(null);
  const [refreshingResponses, startRefreshingResponses] = useTransition();
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [expandedResponses, setExpandedResponses] = useState<Record<string, boolean>>({});

  const canEdit = role === "owner" || role === "admin";

  const shareLink = useMemo(() => {
    if (shareBaseUrl && shareBaseUrl.length > 0) {
      return `${shareBaseUrl.replace(/\/$/, "")}/${formState.shareId}`;
    }
    if (typeof window !== "undefined") {
      return `${window.location.origin}/forms/${formState.shareId}`;
    }
    return `/forms/${formState.shareId}`;
  }, [formState.shareId, shareBaseUrl]);

  const sortedQuestions = useMemo(
    () =>
      questions
        .slice()
        .sort((a, b) => a.position - b.position),
    [questions],
  );

  const questionMap = useMemo(
    () => new Map(sortedQuestions.map((question) => [question.id, question])),
    [sortedQuestions],
  );

  const previewFormPayload = useMemo(
    () => ({
      id: formState.id,
      shareId: formState.shareId,
      title: formState.title,
      description: formState.description,
      submissionMessage: formState.submissionMessage,
      acceptingResponses: formState.acceptingResponses,
      status: formState.status,
      coverImageUrl: formState.coverImageUrl,
      businessName: null as string | null,
    }),
    [formState],
  );

  useEffect(() => {
    if (!isChoiceType(newQuestion.type)) {
      return;
    }

    setNewQuestion((prev) => {
      if (prev.options.length > 0) {
        return prev;
      }

      return {
        ...prev,
        options: ["Option 1", "Option 2"],
      };
    });
  }, [newQuestion.type]);

  useEffect(() => {
    if (activeTab !== "questions") {
      setQuestionView("builder");
    }
  }, [activeTab]);

  useEffect(() => {
    if (responses.length === 0) {
      setExpandedResponses({});
      return;
    }

    setExpandedResponses((prev) => {
      const next: Record<string, boolean> = {};
      responses.forEach((response, index) => {
        next[response.id] = prev[response.id] ?? index === 0;
      });
      return next;
    });
  }, [responses]);

  const getChoiceOptions = (question: FormQuestionClientShape) =>
    Array.isArray(question.settings.options)
      ? (question.settings.options as FormQuestionChoiceOption[])
      : [];

  const resolveChoiceLabel = useCallback((
    question: FormQuestionClientShape | undefined,
    value: string,
  ): string => {
    if (!question) {
      return value;
    }
    const options = Array.isArray(question?.settings.options)
      ? (question.settings.options as FormQuestionChoiceOption[])
      : [];
    const match = options.find((option) => option.value === value);
    return match?.label ?? value;
  }, []);

  const analyticsData = useMemo(() => {
    const results: Array<{
      question: FormQuestionClientShape;
      segments: Array<{ label: string; count: number; percent: number; color: string }>;
      total: number;
      gradient: string;
    }> = [];

    if (responses.length === 0) {
      return results;
    }

    for (const question of sortedQuestions) {
      const counts = new Map<string, number>();

      const increase = (label: string) => {
        const key = label.trim().length > 0 ? label : "No response";
        counts.set(key, (counts.get(key) ?? 0) + 1);
      };

      const questionType = question.type;
      if (
        questionType !== "choice_single" &&
        questionType !== "choice_multi" &&
        questionType !== "boolean" &&
        questionType !== "rating"
      ) {
        continue;
      }

      responses.forEach((response) => {
        const answer = response.answers.find((item) => item.questionId === question.id);

        if (!answer) {
          increase("No response");
          return;
        }

        if (questionType === "choice_multi") {
          const values = answer.valueList ?? [];
          if (values.length === 0) {
            increase("No selection");
            return;
          }

          values.forEach((value) => {
            increase(resolveChoiceLabel(question, value));
          });
          return;
        }

        if (questionType === "choice_single") {
          if (!answer.valueText) {
            increase("No selection");
            return;
          }
          increase(resolveChoiceLabel(question, answer.valueText));
          return;
        }

        if (questionType === "boolean") {
          if (answer.valueBoolean === null) {
            increase("No response");
          } else {
            increase(answer.valueBoolean ? "Yes" : "No");
          }
          return;
        }

        if (questionType === "rating") {
          if (answer.valueNumber !== null) {
            increase(answer.valueNumber.toString());
          } else if (answer.valueText) {
            increase(answer.valueText);
          } else {
            increase("No rating");
          }
        }
      });

      const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0);
      if (total === 0) {
        continue;
      }

      const segments = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([label, count], index) => ({
          label,
          count,
          percent: (count / total) * 100,
          color: PIE_COLORS[index % PIE_COLORS.length],
        }));

      let cumulative = 0;
      const gradientParts = segments.map((segment) => {
        const start = (cumulative / 100) * 360;
        cumulative += segment.percent;
        const end = (cumulative / 100) * 360;
        return `${segment.color} ${start}deg ${end}deg`;
      });

      results.push({
        question,
        segments,
        total,
        gradient: gradientParts.length
          ? `conic-gradient(${gradientParts.join(", ")})`
          : PIE_COLORS[0],
      });
    }

    return results;
  }, [responses, sortedQuestions, resolveChoiceLabel]);

  function buildChoiceOptionsFromArray(
    entries: string[],
  ): FormQuestionChoiceOption[] {
    const labels = entries
      .map((label) => label.trim())
      .filter((label) => label.length > 0);

    const deduped: string[] = [];
    for (const label of labels) {
      if (!deduped.includes(label)) {
        deduped.push(label);
      }
    }

    const options =
      deduped.length > 0
        ? deduped
        : ["Option 1", "Option 2"];

    return options.map((label, index) => ({
      label,
      value: `${ensureOptionValue(label)}-${index}`,
    }));
  }

  function handleChoiceOptionUpdate(
    question: FormQuestionClientShape,
    nextOptions: FormQuestionChoiceOption[],
  ) {
    if (!canEdit) {
      return;
    }

    updateQuestion(question.id, {
      settings: {
        ...question.settings,
        options: nextOptions,
      },
    });
  }

  function handleChoiceOptionLabelChange(
    question: FormQuestionClientShape,
    index: number,
    nextLabel: string,
  ) {
    const safeLabel = nextLabel.trim() || `Option ${index + 1}`;
    const currentOptions = getChoiceOptions(question);
    const updated = currentOptions.map((option, optionIndex) =>
      optionIndex === index
        ? {
            ...option,
            label: safeLabel,
            value:
              option.value && option.value.length > 0
                ? option.value
                : `${ensureOptionValue(safeLabel)}-${index}`,
          }
        : option,
    );
    handleChoiceOptionUpdate(question, updated);
  }

  function handleAddChoiceOption(question: FormQuestionClientShape) {
    const currentOptions = getChoiceOptions(question);
    const nextLabel = `Option ${currentOptions.length + 1}`;
    const nextOption: FormQuestionChoiceOption = {
      label: nextLabel,
      value: `${ensureOptionValue(nextLabel)}-${Date.now().toString(36)}`,
    };
    handleChoiceOptionUpdate(question, [...currentOptions, nextOption]);
  }

  function handleRemoveChoiceOption(
    question: FormQuestionClientShape,
    index: number,
  ) {
    const currentOptions = getChoiceOptions(question);
    const updated = currentOptions.filter(
      (_option, optionIndex) => optionIndex !== index,
    );
    handleChoiceOptionUpdate(question, updated);
  }

  function updateNewQuestionOption(index: number, label: string) {
    setNewQuestion((prev) => {
      const nextOptions = [...prev.options];
      nextOptions[index] = label;
      return {
        ...prev,
        options: nextOptions,
      };
    });
  }

  function normalizeNewQuestionOption(index: number) {
    setNewQuestion((prev) => {
      const nextLabel = prev.options[index]?.trim() ?? "";
      if (nextLabel.length > 0) {
        return prev;
      }
      const nextOptions = [...prev.options];
      nextOptions[index] = `Option ${index + 1}`;
      return {
        ...prev,
        options: nextOptions,
      };
    });
  }

  function addNewQuestionOption() {
    setNewQuestion((prev) => ({
      ...prev,
      options: [
        ...prev.options,
        `Option ${prev.options.length + 1}`,
      ],
    }));
  }

  function removeNewQuestionOption(index: number) {
    setNewQuestion((prev) => {
      if (prev.options.length <= 1) {
        return prev;
      }

      return {
        ...prev,
        options: prev.options.filter(
          (_option, optionIndex) => optionIndex !== index,
        ),
      };
    });
  }

  function triggerCoverFileSelect() {
    if (!canEdit) {
      return;
    }
    fileInputRef.current?.click();
  }

  async function uploadCoverImage(file: File) {
    setCoverUploading(true);
    setCoverError(null);

    const formData = new FormData();
    formData.append("cover", file);

    try {
      const response = await fetch(`/api/forms/${form.id}/cover`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to upload cover image");
      }

      const payload = (await response.json()) as {
        coverImageUrl: string | null;
      };

      setFormState((prev) => ({
        ...prev,
        coverImageUrl: payload.coverImageUrl ?? null,
      }));
    } catch (error) {
      setCoverError(
        error instanceof Error ? error.message : "Failed to upload cover image",
      );
    } finally {
      setCoverUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleCoverFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    await uploadCoverImage(file);
  }

  async function removeCoverImage() {
    if (!canEdit) {
      return;
    }

    setCoverUploading(true);
    setCoverError(null);

    const formData = new FormData();
    formData.append("action", "remove");

    try {
      const response = await fetch(`/api/forms/${form.id}/cover`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to remove cover image");
      }

      setFormState((prev) => ({
        ...prev,
        coverImageUrl: null,
      }));
    } catch (error) {
      setCoverError(
        error instanceof Error ? error.message : "Failed to remove cover image",
      );
    } finally {
      setCoverUploading(false);
    }
  }

  function toggleResponseOpen(id: string, fallback: boolean) {
    setExpandedResponses((prev) => {
      const current = prev[id] ?? fallback;
      return {
        ...prev,
        [id]: !current,
      };
    });
  }

  const formatAnswerForExport = useCallback((
    question: FormQuestionClientShape | undefined,
    answer: FormAnswerRecord | undefined,
  ): string => {
    if (!question || !answer) {
      return "";
    }

    switch (question.type) {
      case "choice_multi": {
        const values = answer.valueList ?? [];
        if (!values.length) {
          return "";
        }
        return values
          .map((value) => resolveChoiceLabel(question, value))
          .join("; ");
      }
      case "choice_single": {
        return answer.valueText
          ? resolveChoiceLabel(question, answer.valueText)
          : "";
      }
      case "boolean": {
        if (answer.valueBoolean === null) {
          return "";
        }
        return answer.valueBoolean ? "Yes" : "No";
      }
      case "rating": {
        if (answer.valueNumber !== null) {
          return answer.valueNumber.toString();
        }
        return answer.valueText ?? "";
      }
      case "file": {
        return answer.file?.url ?? "";
      }
      case "date": {
        return answer.valueDate ? formatDateTime(answer.valueDate) : "";
      }
      default:
        return answer.valueText ?? "";
    }
  }, [resolveChoiceLabel]);

  const escapeCsvValue = useCallback((value: string): string => {
    if (value.includes(",") || value.includes("\n") || value.includes("\"")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }, []);

  const downloadResponsesAsXlsx = useCallback(() => {
    if (responses.length === 0) {
      return;
    }

    const headers = [
      "Submitted At",
      "Status",
      "Submitted IP",
      "User agent",
      ...sortedQuestions.map((question) => question.label || question.fieldKey),
    ];

    const csvRows = responses.map((response) => {
      const values: string[] = [];
      values.push(formatDateTime(response.submittedAt));
      values.push(response.status);
      values.push(response.submittedIp ?? "");
      values.push(response.submittedUserAgent ?? "");

      const answerMap = new Map(
        response.answers.map((answer) => [answer.questionId, answer]),
      );

      sortedQuestions.forEach((question) => {
        const answer = answerMap.get(question.id);
        values.push(formatAnswerForExport(question, answer));
      });

      return values.map(escapeCsvValue).join(",");
    });

    const csvContent = [headers.map(escapeCsvValue).join(","), ...csvRows].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeTitle = (formState.title || "form").replace(/[^a-z0-9-]+/gi, "_").toLowerCase();
    link.download = `${safeTitle || "form"}-responses.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [escapeCsvValue, formatAnswerForExport, formState.title, responses, sortedQuestions]);

  async function updateForm(updates: Partial<typeof formState>) {
    if (!canEdit) {
      return;
    }

    const previous = formState;
    const optimistic = { ...formState, ...updates };
    setFormState(optimistic);
    setSavingForm(true);

    try {
      const response = await fetch(`/api/forms/${form.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error("Failed to update form");
      }

      const payload = (await response.json()) as {
        form: typeof formState;
      };

      setFormState({
        ...optimistic,
        ...payload.form,
      });
    } catch (error) {
      console.error(error);
      setFormState(previous);
    } finally {
      setSavingForm(false);
    }
  }

  async function createQuestion() {
    if (!canEdit || creatingQuestion) {
      return;
    }

    if (!newQuestion.label.trim()) {
      return;
    }

    const baseSettings: Record<string, unknown> = {};

    if (isChoiceType(newQuestion.type)) {
      baseSettings.options = buildChoiceOptionsFromArray(newQuestion.options);
    }

    setCreatingQuestion(true);

    try {
      const response = await fetch(`/api/forms/${form.id}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          label: newQuestion.label.trim(),
          description: newQuestion.description.trim() || undefined,
          required: newQuestion.required,
          type: newQuestion.type,
          settings: baseSettings,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create question");
      }

      const payload = (await response.json()) as {
        question: FormQuestionClientShape;
      };

      setQuestions((prev) => [...prev, payload.question]);
      setNewQuestion({
        label: "",
        type: "short_text",
        description: "",
        required: false,
        options: ["Option 1", "Option 2"],
      });
    } catch (error) {
      console.error(error);
    } finally {
      setCreatingQuestion(false);
    }
  }

  async function updateQuestion(
    questionId: string,
    updates: Partial<FormQuestionClientShape>,
  ) {
    if (!canEdit) {
      return;
    }

    const current = questions.find((item) => item.id === questionId);

    if (!current) {
      return;
    }

    const previous = current;
    setQuestions((prev) =>
      prev.map((item) =>
        item.id === questionId
          ? {
              ...item,
              ...updates,
            }
          : item,
      ),
    );
    setQuestionLoading(questionId);

    try {
      const response = await fetch(
        `/api/forms/${form.id}/questions/${questionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update question");
      }

      const payload = (await response.json()) as {
        question: FormQuestionClientShape;
      };

      setQuestions((prev) =>
        prev.map((item) =>
          item.id === questionId ? payload.question : item,
        ),
      );
    } catch (error) {
      console.error(error);
      setQuestions((prev) =>
        prev.map((item) => (item.id === questionId ? previous : item)),
      );
    } finally {
      setQuestionLoading(null);
    }
  }

  async function deleteQuestion(questionId: string) {
    if (!canEdit) {
      return;
    }

    setQuestionLoading(questionId);

    try {
      const response = await fetch(
        `/api/forms/${form.id}/questions/${questionId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete question");
      }

      setQuestions((prev) => prev.filter((item) => item.id !== questionId));
    } catch (error) {
      console.error(error);
    } finally {
      setQuestionLoading(null);
    }
  }

  function copyShareLink() {
    navigator.clipboard
      .writeText(shareLink)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2200);
      })
      .catch((error) => {
        console.error("Failed to copy share link", error);
      });
  }

  function refreshResponses() {
    startRefreshingResponses(async () => {
      try {
        const response = await fetch(`/api/forms/${form.id}/responses`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch responses");
        }

        const payload = (await response.json()) as {
          responses: FormResponseRecord[];
          summary: typeof summary;
        };

        setResponses(payload.responses);
        setSummary(payload.summary);
      } catch (error) {
        console.error(error);
      }
    });
  }

  const statusDescriptor = STATUS_OPTIONS.find(
    (item) => item.value === formState.status,
  );

  return (
    <div className="space-y-10">
      <div>
        <Link
          href="/app/forms"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:border-[#23a5fe]/60 hover:bg-[#0b2a4a]"
        >
          <FiArrowLeft className="text-sm" />
          Back to forms
        </Link>
      </div>
      <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#03162d] via-[#07254c] to-[#0c3c78] p-8 text-white shadow-[0_40px_120px_rgba(3,22,45,0.65)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[#3eb6fd]">
                Form overview
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold">
                {statusDescriptor?.label ?? formState.status}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold">
                {formState.acceptingResponses ? "Accepting" : "Closed"}
              </span>
            </div>

            {canEdit ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm text-white/70">
                  <FiEdit3 className="text-white/60" />
                  <span>Title</span>
                </div>
                <input
                  type="text"
                  value={formState.title}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      title: event.target.value,
                    }))
                  }
                  onBlur={(event) =>
                    updateForm({ title: event.target.value.trim() })
                  }
                  className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-2xl font-semibold text-white outline-none transition focus:border-[#23a5fe] focus:bg-white/20"
                  placeholder="Form title"
                />
                <textarea
                  value={formState.description ?? ""}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  onBlur={(event) =>
                    updateForm({
                      description: event.target.value.trim() || null,
                    })
                  }
                  className="mt-3 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white/80 outline-none transition focus:border-[#23a5fe] focus:bg-white/15"
                  placeholder="Describe what you collect and how submissions are used."
                  rows={3}
                />
              </div>
            ) : (
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">
                  {formState.title}
                </h1>
                {formState.description ? (
                  <p className="mt-2 max-w-2xl text-sm text-white/70">
                    {formState.description}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <div className="flex w-full flex-col gap-4 rounded-3xl border border-white/10 bg-white/10 p-6 text-sm text-white/80 lg:max-w-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#3eb6fd]">
                Share link
              </p>
              <div className="mt-3 flex items-center gap-3">
                <p className="flex-1 truncate rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-mono text-white/80">
                  {shareLink}
                </p>
                <button
                  type="button"
                  onClick={copyShareLink}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white transition hover:border-[#3eb6fd]/60 hover:bg-[#123359]"
                >
                  {copySuccess ? <FiCheckCircle /> : <FiCopy />}
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#3eb6fd]">
                Cover image
              </p>
              <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                {formState.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={formState.coverImageUrl}
                    alt="Form cover"
                    className="h-44 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-44 w-full items-center justify-center bg-white/5 text-xs text-white/60">
                    No cover selected
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={triggerCoverFileSelect}
                  disabled={!canEdit || coverUploading}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:border-[#23a5fe]/60 hover:bg-[#0b2a4a] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FiUploadCloud />
                  {coverUploading ? "Uploading…" : "Upload"}
                </button>
                {formState.coverImageUrl ? (
                  <button
                    type="button"
                    onClick={removeCoverImage}
                    disabled={!canEdit || coverUploading}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:border-red-400/60 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FiTrash2 />
                    Remove
                  </button>
                ) : null}
              </div>
              {coverError ? (
                <p className="mt-2 text-xs text-red-300">{coverError}</p>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverFileChange}
              />
            </div>

            {canEdit ? (
              <div className="grid gap-3">
                <label className="text-xs uppercase tracking-[0.3em] text-[#3eb6fd]">
                  Status
                </label>
                <select
                  value={formState.status}
                  onChange={(event) =>
                    updateForm({ status: event.target.value as FormStatus })
                  }
                  className="w-full rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none transition focus:border-[#23a5fe] focus:bg-white/15"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      className="text-[#03162d]"
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
                <label className="mt-4 inline-flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={formState.acceptingResponses}
                    onChange={(event) =>
                      updateForm({ acceptingResponses: event.target.checked })
                    }
                    className="h-4 w-4 rounded border-white/20 bg-white/10 text-[#23a5fe]"
                  />
                  Accept new responses
                </label>
                <textarea
                  value={formState.submissionMessage ?? ""}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      submissionMessage: event.target.value,
                    }))
                  }
                  onBlur={(event) =>
                    updateForm({
                      submissionMessage: event.target.value.trim() || null,
                    })
                  }
                  className="mt-3 w-full rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-xs text-white/80 outline-none transition focus:border-[#23a5fe] focus:bg-white/15"
                  placeholder="Confirmation message shown after people submit this form."
                  rows={3}
                />
              </div>
            ) : (
              <div className="space-y-2 text-xs text-white/70">
                <p>Status: {statusDescriptor?.label ?? formState.status}</p>
                <p>
                  Responses:{" "}
                  {formState.acceptingResponses ? "Open" : "Closed"}
                </p>
              </div>
            )}

            {savingForm ? (
              <div className="flex items-center gap-2 text-xs text-white/60">
                <FiLoader className="animate-spin" />
                Saving changes…
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <section className="flex flex-wrap items-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-[#3eb6fd]">
          Insights
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1">
          {summary.submitted} submitted
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1">
          {summary.flagged} flagged
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1">
          {summary.spam} spam
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1">
          Last response: {formatDateTime(form.lastSubmissionAt)}
        </span>
        <button
          type="button"
          onClick={refreshResponses}
          className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:border-[#3eb6fd]/60 hover:bg-[#0b2a4a]"
        >
          {refreshingResponses ? (
            <>
              <FiLoader className="animate-spin" />
              Refreshing…
            </>
          ) : (
            <>
              <FiRefreshCw />
              Refresh data
            </>
          )}
        </button>
      </section>

      <div className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-2 text-white/70">
        <button
          type="button"
          onClick={() => setActiveTab("questions")}
          className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
            activeTab === "questions"
              ? "bg-gradient-to-r from-[#0064d6] via-[#23a5fe] to-[#3eb6fd] text-[#03162d]"
              : "bg-white/5 text-white"
          }`}
        >
          Questions
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("responses")}
          className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
            activeTab === "responses"
              ? "bg-gradient-to-r from-[#0064d6] via-[#23a5fe] to-[#3eb6fd] text-[#03162d]"
              : "bg-white/5 text-white"
          }`}
        >
          Responses ({summary.total})
        </button>
      </div>

      {activeTab === "questions" ? (
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="text-xs uppercase tracking-[0.3em] text-white/40">
              View mode
            </span>
            <div className="flex overflow-hidden rounded-full border border-white/15 bg-white/5">
              <button
                type="button"
                onClick={() => setQuestionView("builder")}
                className={`px-4 py-2 text-xs font-semibold transition ${
                  questionView === "builder"
                    ? "bg-[#23a5fe] text-[#03162d]"
                    : "text-white/70 hover:text-white"
                }`}
              >
                Builder
              </button>
              <button
                type="button"
                onClick={() => setQuestionView("preview")}
                className={`px-4 py-2 text-xs font-semibold transition ${
                  questionView === "preview"
                    ? "bg-[#23a5fe] text-[#03162d]"
                    : "text-white/70 hover:text-white"
                }`}
              >
                Preview
              </button>
            </div>
          </div>

          {questionView === "preview" ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_25px_65px_rgba(5,20,40,0.45)]">
              <PublicFormRenderer form={previewFormPayload} questions={sortedQuestions} />
            </div>
          ) : sortedQuestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-white/20 bg-white/5 px-6 py-16 text-center text-white/70">
              <FiInbox className="text-3xl text-[#23a5fe]" />
              <p className="text-lg font-semibold text-white">
                Build your first question
              </p>
              <p className="max-w-md text-sm">
                Mix text fields, ratings, and secure uploads to handle every
                intake workflow.
              </p>
            </div>
          ) : (
            <div className="grid gap-5">
              {sortedQuestions.map((question) => (
                  <article
                    key={question.id}
                    className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_25px_65px_rgba(5,20,40,0.45)] transition hover:border-[#3eb6fd]/60"
                  >
                    <div className="flex flex-wrap items-start gap-4">
                      <div className="flex-1 space-y-4">
                        <div className="grid gap-2">
                          <label className="text-xs uppercase tracking-[0.3em] text-[#3eb6fd]">
                            Question label
                          </label>
                          <input
                            type="text"
                            value={question.label}
                            disabled={!canEdit}
                            onChange={(event) =>
                              setQuestions((prev) =>
                                prev.map((item) =>
                                  item.id === question.id
                                    ? {
                                        ...item,
                                        label: event.target.value,
                                      }
                                    : item,
                                ),
                              )
                            }
                            onBlur={(event) =>
                              updateQuestion(question.id, {
                                label: event.target.value.trim(),
                              })
                            }
                            className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-[#23a5fe] focus:bg-white/15 disabled:cursor-not-allowed"
                          />
                        </div>

                        <div className="grid gap-2">
                          <label className="text-xs uppercase tracking-[0.3em] text-[#3eb6fd]">
                            Helper text
                          </label>
                          <textarea
                            value={question.description ?? ""}
                            disabled={!canEdit}
                            onChange={(event) =>
                              setQuestions((prev) =>
                                prev.map((item) =>
                                  item.id === question.id
                                    ? {
                                        ...item,
                                        description: event.target.value,
                                      }
                                    : item,
                                ),
                              )
                            }
                            onBlur={(event) =>
                              updateQuestion(question.id, {
                                description: event.target.value.trim() || null,
                              })
                            }
                            className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-[#23a5fe] focus:bg-white/15 disabled:cursor-not-allowed"
                            rows={3}
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-white/70">
                          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1">
                            Type:{" "}
                            {QUESTION_TYPES.find(
                              (item) => item.value === question.type,
                            )?.label ?? question.type}
                          </span>
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={question.required}
                              disabled={!canEdit}
                              onChange={(event) =>
                                updateQuestion(question.id, {
                                  required: event.target.checked,
                                })
                              }
                              className="h-4 w-4 rounded border-white/20 bg-white/10 text-[#23a5fe]"
                            />
                            Required
                          </label>
                          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                            Field key:{" "}
                            <code className="font-mono text-xs">
                              {question.fieldKey}
                            </code>
                          </span>
                        </div>

                        {isChoiceType(question.type) ? (
                          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p className="text-xs uppercase tracking-[0.3em] text-[#3eb6fd]">
                              Options
                            </p>
                            <div className="space-y-2">
                              {getChoiceOptions(question).map((option, index) => (
                                <div
                                  key={option.value ?? `option-${index}`}
                                  className="flex items-center gap-2"
                                >
                                  <input
                                    type="text"
                                    value={option.label}
                                    disabled={!canEdit}
                                    onChange={(event) =>
                                      setQuestions((prev) =>
                                        prev.map((item) =>
                                          item.id === question.id
                                            ? {
                                                ...item,
                                                settings: {
                                                  ...item.settings,
                                                  options: getChoiceOptions(item).map(
                                                    (existing, optionIndex) =>
                                                      optionIndex === index
                                                        ? {
                                                            ...existing,
                                                            label: event.target.value,
                                                          }
                                                        : existing,
                                                  ),
                                                },
                                              }
                                            : item,
                                        ),
                                      )
                                    }
                                    onBlur={(event) =>
                                      handleChoiceOptionLabelChange(
                                        question,
                                        index,
                                        event.target.value.trim(),
                                      )
                                    }
                                    className="flex-1 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-white outline-none transition focus:border-[#23a5fe] focus:bg-white/15 disabled:cursor-not-allowed"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveChoiceOption(question, index)}
                                    disabled={!canEdit || getChoiceOptions(question).length <= 1}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white/70 transition hover:border-red-400/60 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <FiTrash2 />
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => handleAddChoiceOption(question)}
                                disabled={!canEdit}
                                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-[#23a5fe]/60 hover:bg-[#0b2a4a] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <FiPlus />
                                Add option
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {canEdit ? (
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => deleteQuestion(question.id)}
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:border-red-400/60 hover:bg-red-500/20"
                          >
                            {questionLoading === question.id ? (
                              <>
                                <FiLoader className="animate-spin" />
                                Updating…
                              </>
                            ) : (
                              <>
                                <FiTrash2 />
                                Delete
                              </>
                            )}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
            </div>
          )}

          {canEdit ? (
            <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 p-6 text-white">
              <h3 className="text-lg font-semibold">Add a question</h3>
              <p className="mt-2 text-sm text-white/70">
                Mix formats to capture structured and unstructured data,
                including uploads and consent toggles.
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-xs uppercase tracking-[0.3em] text-[#3eb6fd]">
                    Label
                  </label>
                  <input
                    type="text"
                    value={newQuestion.label}
                    onChange={(event) =>
                      setNewQuestion((prev) => ({
                        ...prev,
                        label: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none transition focus:border-[#23a5fe] focus:bg-white/15"
                    placeholder="What do you want to ask?"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs uppercase tracking-[0.3em] text-[#3eb6fd]">
                    Type
                  </label>
                  <select
                    value={newQuestion.type}
                    onChange={(event) =>
                      setNewQuestion((prev) => ({
                        ...prev,
                        type: event.target.value as FormQuestionType,
                      }))
                    }
                    className="w-full rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none transition focus:border-[#23a5fe] focus:bg-white/15"
                  >
                    {QUESTION_TYPES.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                        className="text-[#03162d]"
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs uppercase tracking-[0.3em] text-[#3eb6fd]">
                    Description
                  </label>
                  <textarea
                    value={newQuestion.description}
                    onChange={(event) =>
                      setNewQuestion((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none transition focus:border-[#23a5fe] focus:bg-white/15"
                    rows={3}
                    placeholder="Optional helper copy shown under the field."
                  />
                </div>

                {isChoiceType(newQuestion.type) ? (
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-xs uppercase tracking-[0.3em] text-[#3eb6fd]">
                      Answer choices
                    </label>
                    <div className="space-y-2">
                      {newQuestion.options.map((option, index) => (
                        <div
                          key={`new-option-${index}`}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="text"
                            value={option}
                            onChange={(event) =>
                              updateNewQuestionOption(index, event.target.value)
                            }
                            onBlur={() => normalizeNewQuestionOption(index)}
                            className="flex-1 rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none transition focus:border-[#23a5fe] focus:bg-white/15"
                            placeholder={`Option ${index + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() => removeNewQuestionOption(index)}
                            disabled={newQuestion.options.length <= 1}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white/70 transition hover:border-red-400/60 hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addNewQuestionOption}
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:border-[#23a5fe]/60 hover:bg-[#0b2a4a]"
                      >
                        <FiPlus />
                        Add option
                      </button>
                    </div>
                    <p className="text-xs text-white/50">
                      Provide at least one choice. Labels are stored with stable underlying
                      values automatically.
                    </p>
                  </div>
                ) : null}

                <label className="inline-flex items-center gap-2 text-sm text-white/70">
                  <input
                    type="checkbox"
                    checked={newQuestion.required}
                    onChange={(event) =>
                      setNewQuestion((prev) => ({
                        ...prev,
                        required: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-white/20 bg-white/10 text-[#23a5fe]"
                  />
                  Required question
                </label>
              </div>

              <button
                type="button"
                onClick={createQuestion}
                disabled={creatingQuestion || !newQuestion.label.trim()}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#23a5fe] px-5 py-3 text-sm font-semibold text-[#03162d] shadow-[0_20px_60px_rgba(35,165,254,0.45)] transition hover:bg-[#3eb6fd] disabled:cursor-not-allowed disabled:bg-[#1d466c] disabled:text-white/40"
              >
                {creatingQuestion ? (
                  <>
                    <FiLoader className="animate-spin" />
                    Adding…
                  </>
                ) : (
                  <>
                    <FiPlus />
                    Add question
                  </>
                )}
              </button>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex overflow-hidden rounded-full border border-white/15 bg-white/5">
              <button
                type="button"
                onClick={() => setResponsesView("list")}
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold transition ${
                  responsesView === "list"
                    ? "bg-[#23a5fe] text-[#03162d]"
                    : "text-white/70 hover:text-white"
                }`}
              >
                <FiList /> Detail
              </button>
              <button
                type="button"
                onClick={() => setResponsesView("analytics")}
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold transition ${
                  responsesView === "analytics"
                    ? "bg-[#23a5fe] text-[#03162d]"
                    : "text-white/70 hover:text-white"
                }`}
              >
                <FiBarChart2 /> Analytics
              </button>
            </div>
            <button
              type="button"
              onClick={downloadResponsesAsXlsx}
              disabled={responses.length === 0}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:border-[#23a5fe]/60 hover:bg-[#0b2a4a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiDownload /> Export CSV
            </button>
          </div>

          {responses.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-white/20 bg-white/5 px-6 py-16 text-center text-white/70">
              <FiActivity className="text-3xl text-[#23a5fe]" />
              <p className="text-lg font-semibold text-white">No responses yet</p>
              <p className="max-w-md text-sm">
                Drop your share link where your audience lives and every answer will stream into this dashboard in real time.
              </p>
            </div>
          ) : responsesView === "analytics" ? (
            analyticsData.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-10 text-center text-white/70">
                <p className="text-sm">No chartable questions yet. Add single or multi-select fields to see analytics.</p>
              </div>
            ) : (
              analyticsData.map((item) => (
                <article
                  key={item.question.id}
                  className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_25px_65px_rgba(5,20,40,0.45)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 text-xs uppercase tracking-[0.3em] text-[#3eb6fd]">
                    <span>{item.question.label}</span>
                    <span>Total responses: {item.total}</span>
                  </div>
                  <div className="grid gap-6 lg:grid-cols-[220px,1fr] lg:items-center">
                    <div className="flex flex-col items-center gap-3">
                      <div
                        className="flex h-44 w-44 items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-inner"
                        style={{ background: item.gradient }}
                      >
                        <span className="text-sm font-semibold text-[#03162d]">
                          {Math.round(item.segments[0]?.percent ?? 0)}%
                        </span>
                      </div>
                      <p className="text-xs text-white/60">Top option share</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/10 text-xs uppercase tracking-[0.2em] text-white/50">
                            <th className="px-4 py-3 text-left">Choice</th>
                            <th className="px-4 py-3 text-right">Responses</th>
                            <th className="px-4 py-3 text-right">Share</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.segments.map((segment) => (
                            <tr key={`${item.question.id}-${segment.label}`} className="border-b border-white/5 last:border-none">
                              <td className="px-4 py-2">
                                <span className="inline-flex items-center gap-2">
                                  <span
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{ backgroundColor: segment.color }}
                                  />
                                  {segment.label}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right text-white/80">{segment.count}</td>
                              <td className="px-4 py-2 text-right text-white/60">
                                {segment.percent.toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </article>
              ))
            )
          ) : (
            responses.map((response, index) => {
              const isExpanded = expandedResponses[response.id] ?? index === 0;
              const toggle = () => toggleResponseOpen(response.id, index === 0);
              const submissionSource =
                response.metadata && typeof response.metadata === "object" && "submissionSource" in response.metadata
                  ? String((response.metadata as Record<string, unknown>).submissionSource)
                  : null;

              return (
                <article
                  key={response.id}
                  className="rounded-3xl border border-white/10 bg-white/5 text-white shadow-[0_25px_65px_rgba(5,20,40,0.45)]"
                >
                  <button
                    type="button"
                    onClick={toggle}
                    className="flex w-full items-center justify-between gap-3 px-6 py-5 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs">
                        <FiEye />
                        {formatDateTime(response.submittedAt)}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs">
                        Status: {response.status}
                      </span>
                      {response.submittedIp ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs">
                          IP: {response.submittedIp}
                        </span>
                      ) : null}
                    </div>
                    <FiChevronDown
                      className={`h-5 w-5 shrink-0 transition-transform ${
                        isExpanded ? "rotate-180" : "rotate-0"
                      }`}
                    />
                  </button>

                  {isExpanded ? (
                    <div className="border-t border-white/10 px-6 py-5">
                      <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
                        <span>Response ID: {response.id.slice(0, 8)}…</span>
                        {submissionSource ? <span>Source: {submissionSource}</span> : null}
                      </div>

                      <div className="mt-5 grid gap-4">
                        {response.answers.map((answer) => {
                          const questionMeta = questionMap.get(answer.questionId);
                          const resolvedList = answer.valueList?.map((value) =>
                            resolveChoiceLabel(questionMeta, value),
                          );
                          const resolvedText =
                            answer.valueText && questionMeta && isChoiceType(questionMeta.type)
                              ? resolveChoiceLabel(questionMeta, answer.valueText)
                              : answer.valueText;

                          const isImageFile =
                            answer.file?.contentType &&
                            answer.file.contentType.startsWith("image/");

                          return (
                            <div
                              key={answer.id}
                              className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-xs uppercase tracking-[0.3em] text-[#3eb6fd]">
                                  {answer.label}
                                </p>
                                <span className="text-[11px] uppercase text-white/40">
                                  {questionMeta?.type ?? "field"}
                                </span>
                              </div>

                              <div className="mt-3 text-white">
                                {resolvedList && resolvedList.length ? (
                                  <ul className="flex flex-wrap items-center gap-2">
                                    {resolvedList.map((item) => (
                                      <li
                                        key={`${answer.id}-${item}`}
                                        className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs"
                                      >
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                ) : answer.file && answer.file.url ? (
                                  <div className="space-y-3">
                                    {isImageFile ? (
                                      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={answer.file.url}
                                          alt={answer.file.name ?? answer.label}
                                          className="max-h-64 w-full object-contain"
                                        />
                                      </div>
                                    ) : null}
                                    <Link
                                      href={answer.file.url}
                                      target="_blank"
                                      className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs transition hover:border-[#3eb6fd]/60 hover:bg-[#0b2a4a]"
                                    >
                                      <FiAlertCircle />
                                      {answer.file.name ?? "File"}
                                      <span className="text-white/60">
                                        {formatFileSize(answer.file.size)}
                                      </span>
                                    </Link>
                                  </div>
                                ) : answer.valueBoolean !== null ? (
                                  <span>{answer.valueBoolean ? "Yes" : "No"}</span>
                                ) : answer.valueNumber !== null ? (
                                  <span>{answer.valueNumber}</span>
                                ) : answer.valueDate ? (
                                  <span>{formatDateTime(answer.valueDate)}</span>
                                ) : (
                                  <span>{resolvedText && resolvedText.length > 0 ? resolvedText : "—"}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </section>
      )}
    </div>
  );
}
