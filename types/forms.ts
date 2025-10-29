export type FormStatus = "draft" | "active" | "archived";

export type FormResponseStatus = "submitted" | "flagged" | "spam" | "deleted";

export type FormQuestionType =
  | "short_text"
  | "long_text"
  | "email"
  | "number"
  | "decimal"
  | "boolean"
  | "date"
  | "time"
  | "choice_single"
  | "choice_multi"
  | "file"
  | "rating";

export type FormQuestionChoiceOption = {
  value: string;
  label: string;
  description?: string;
};

export type FormQuestionValidation = {
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  step?: number;
  pattern?: string;
  maxFiles?: number;
  maxFileSizeMB?: number;
  allowedFileTypes?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleStep?: number;
};

export type FormQuestionSettings = {
  placeholder?: string;
  helpText?: string;
  options?: FormQuestionChoiceOption[];
  validation?: FormQuestionValidation;
  defaultValue?: unknown;
};

export type FormQuestionClientShape = {
  id: string;
  fieldKey: string;
  type: FormQuestionType;
  label: string;
  description?: string | null;
  required: boolean;
  position: number;
  settings: FormQuestionSettings;
};

export type FormSummary = {
  id: string;
  shareId: string;
  title: string;
  status: FormStatus;
  acceptingResponses: boolean;
  coverImageUrl: string | null;
  responseCount: number;
  lastSubmissionAt: string | null;
};

export type FormResponseAnswer = {
  id: string;
  questionId: string;
  fieldKey: string;
  label: string;
  type: FormQuestionType;
  valueText: string | null;
  valueNumber: number | null;
  valueBoolean: boolean | null;
  valueDate: string | null;
  valueList: string[] | null;
  file: {
    url: string;
    name: string | null;
    size: number | null;
    contentType: string | null;
  } | null;
};

export type FormResponseRecord = {
  id: string;
  status: FormResponseStatus;
  submittedAt: string;
  submittedByUserId: string | null;
  submittedIp: string | null;
  submittedUserAgent: string | null;
  metadata: Record<string, unknown>;
  answers: FormResponseAnswer[];
};
