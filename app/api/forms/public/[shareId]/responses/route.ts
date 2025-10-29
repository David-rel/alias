import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import {
  pool,
  query,
  type DbFormAnswerRow,
  type DbFormQuestionRow,
  type DbFormResponseRow,
  type DbFormRow,
} from "@/lib/db";
import type {
  FormQuestionSettings,
  FormQuestionType,
} from "@/types/forms";

type RouteContext = {
  params: Promise<{
    shareId: string;
  }>;
};

type AnswerPreparation = {
  questionId: string;
  fieldKey: string;
  type: FormQuestionType;
  valueText: string | null;
  valueNumber: string | null;
  valueBoolean: boolean | null;
  valueDate: Date | null;
  valueJson: unknown | null;
  file?: File | null;
  settings: FormQuestionSettings;
};

function sanitizeText(value: FormDataEntryValue | null): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function deriveExtension(file: File): string | null {
  const name = file.name ?? "";
  const match = name.match(/\.([a-zA-Z0-9]+)$/);
  if (match) {
    return match[1]?.toLowerCase() ?? null;
  }
  return null;
}

export async function POST(request: Request, context: RouteContext) {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.startsWith("multipart/form-data")) {
    return NextResponse.json(
      { error: "Requests must use multipart/form-data encoding" },
      { status: 400 },
    );
  }

  const formData = await request.formData();
  const { shareId } = await context.params;

  const formResult = await query<DbFormRow>(
    `SELECT f.*
       FROM forms f
      WHERE f.share_id = $1
      LIMIT 1`,
    [shareId],
  );

  const form = formResult.rows[0] ?? null;

  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  if (form.status !== "active") {
    return NextResponse.json(
      { error: "Form is not accepting submissions" },
      { status: 403 },
    );
  }

  if (!form.accepting_responses) {
    return NextResponse.json(
      { error: "Form is currently closed" },
      { status: 429 },
    );
  }

  const questionsResult = await query<DbFormQuestionRow>(
    `SELECT *
       FROM form_questions
      WHERE form_id = $1
      ORDER BY position ASC, created_at ASC`,
    [form.id],
  );

  const questions = questionsResult.rows.map((question) => ({
    ...question,
    settings:
      (question.settings && typeof question.settings === "object"
        ? question.settings
        : {}) as FormQuestionSettings,
  }));

  const answers: AnswerPreparation[] = [];
  const errors: Array<{ fieldKey: string; message: string }> = [];

  for (const question of questions) {
    const fieldKey = question.field_key;
    const settings = question.settings;
    const required = question.required;
    const type = question.question_type as FormQuestionType;
    let prepared: AnswerPreparation | null = null;

    switch (type) {
      case "short_text":
      case "long_text":
      case "email":
      case "choice_single": {
        const value = sanitizeText(formData.get(fieldKey));

        if (required && !value) {
          errors.push({
            fieldKey,
            message: "This field is required.",
          });
          continue;
        }

        prepared = {
          questionId: question.id,
          fieldKey,
          type,
          valueText: value,
          valueNumber: null,
          valueBoolean: null,
          valueDate: null,
          valueJson: null,
          file: null,
          settings,
        };
        break;
      }
      case "choice_multi": {
        const values = formData
          .getAll(fieldKey)
          .filter((entry): entry is string => typeof entry === "string")
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0);

        if (required && values.length === 0) {
          errors.push({
            fieldKey,
            message: "Select at least one option.",
          });
          continue;
        }

        prepared = {
          questionId: question.id,
          fieldKey,
          type,
          valueText: null,
          valueNumber: null,
          valueBoolean: null,
          valueDate: null,
          valueJson: values.length > 0 ? values : null,
          file: null,
          settings,
        };
        break;
      }
      case "number":
      case "decimal":
      case "rating": {
        const raw = sanitizeText(formData.get(fieldKey));

        if (!raw) {
          if (required) {
            errors.push({
              fieldKey,
              message: "Provide a numeric response.",
            });
          }
          prepared = {
            questionId: question.id,
            fieldKey,
            type,
            valueText: null,
            valueNumber: null,
            valueBoolean: null,
            valueDate: null,
            valueJson: null,
            file: null,
            settings,
          };
          break;
        }

        if (Number.isNaN(Number(raw))) {
          errors.push({
            fieldKey,
            message: "Enter a valid number.",
          });
          continue;
        }

        prepared = {
          questionId: question.id,
          fieldKey,
          type,
          valueText: null,
          valueNumber: raw,
          valueBoolean: null,
          valueDate: null,
          valueJson: null,
          file: null,
          settings,
        };
        break;
      }
      case "boolean": {
        const value = formData.get(fieldKey);
        let booleanValue: boolean | null = null;

        if (typeof value === "string") {
          const normalized = value.toLowerCase();
          if (["true", "1", "on", "yes"].includes(normalized)) {
            booleanValue = true;
          } else if (["false", "0", "off", "no"].includes(normalized)) {
            booleanValue = false;
          }
        }

        if (required && booleanValue === null) {
          errors.push({
            fieldKey,
            message: "Confirm or decline to continue.",
          });
          continue;
        }

        prepared = {
          questionId: question.id,
          fieldKey,
          type,
          valueText: null,
          valueNumber: null,
          valueBoolean: booleanValue,
          valueDate: null,
          valueJson: null,
          file: null,
          settings,
        };
        break;
      }
      case "date": {
        const raw = sanitizeText(formData.get(fieldKey));

        if (!raw) {
          if (required) {
            errors.push({
              fieldKey,
              message: "Select a valid date.",
            });
          }

          prepared = {
            questionId: question.id,
            fieldKey,
            type,
            valueText: null,
            valueNumber: null,
            valueBoolean: null,
            valueDate: null,
            valueJson: null,
            file: null,
            settings,
          };
          break;
        }

        const parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime())) {
          errors.push({
            fieldKey,
            message: "Select a valid date.",
          });
          continue;
        }

        prepared = {
          questionId: question.id,
          fieldKey,
          type,
          valueText: null,
          valueNumber: null,
          valueBoolean: null,
          valueDate: parsed,
          valueJson: null,
          file: null,
          settings,
        };
        break;
      }
      case "time": {
        const raw = sanitizeText(formData.get(fieldKey));

        if (!raw) {
          if (required) {
            errors.push({
              fieldKey,
              message: "Provide a time value.",
            });
          }

          prepared = {
            questionId: question.id,
            fieldKey,
            type,
            valueText: null,
            valueNumber: null,
            valueBoolean: null,
            valueDate: null,
            valueJson: null,
            file: null,
            settings,
          };
          break;
        }

        prepared = {
          questionId: question.id,
          fieldKey,
          type,
          valueText: raw,
          valueNumber: null,
          valueBoolean: null,
          valueDate: null,
          valueJson: null,
          file: null,
          settings,
        };
        break;
      }
      case "file": {
        const entries = formData.getAll(fieldKey);
        const file = entries.find(
          (entry): entry is File => entry instanceof File && entry.size > 0,
        );

        if (!file) {
          if (required) {
            errors.push({
              fieldKey,
              message: "Attach a file to continue.",
            });
          }

          prepared = {
            questionId: question.id,
            fieldKey,
            type,
            valueText: null,
            valueNumber: null,
            valueBoolean: null,
            valueDate: null,
            valueJson: null,
            file: null,
            settings,
          };
          break;
        }

        const validation = settings.validation ?? {};
        const maxFileSizeMB = validation.maxFileSizeMB ?? 15;
        if (file.size > maxFileSizeMB * 1024 * 1024) {
          errors.push({
            fieldKey,
            message: `File exceeds the ${maxFileSizeMB}MB limit.`,
          });
          continue;
        }

        if (validation.allowedFileTypes && validation.allowedFileTypes.length) {
          const extension = deriveExtension(file);
          const mime = (file.type ?? "").toLowerCase();
          const matches = validation.allowedFileTypes.some((pattern) => {
            const normalized = pattern.toLowerCase();
            if (normalized.startsWith(".")) {
              return extension === normalized.slice(1);
            }
            return mime === normalized;
          });

          if (!matches) {
            errors.push({
              fieldKey,
              message: "File type is not allowed for this field.",
            });
            continue;
          }
        }

        prepared = {
          questionId: question.id,
          fieldKey,
          type,
          valueText: null,
          valueNumber: null,
          valueBoolean: null,
          valueDate: null,
          valueJson: null,
          file,
          settings,
        };
        break;
      }
      default:
        errors.push({
          fieldKey,
          message: "Unsupported question type.",
        });
    }

    if (prepared) {
      answers.push(prepared);
    }
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Validation failed", details: errors },
      { status: 422 },
    );
  }

  const submittedIpHeader = request.headers.get("x-forwarded-for");
  const submittedIp = submittedIpHeader
    ? submittedIpHeader.split(",")[0]?.trim() ?? null
    : null;
  const userAgent = request.headers.get("user-agent") ?? null;

  const metadata = {
    submissionSource: "public",
    shareId,
  };

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN ?? null;
  const uploadedFiles: string[] = [];

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const responseResult = await client.query<DbFormResponseRow>(
      `INSERT INTO form_responses (
          form_id,
          submitted_by_user_id,
          submitted_ip,
          submitted_user_agent,
          status,
          metadata
        ) VALUES ($1, NULL, $2, $3, 'submitted', $4)
        RETURNING *`,
      [form.id, submittedIp, userAgent, JSON.stringify(metadata)],
    );

    const response = responseResult.rows[0];

    for (const answer of answers) {
      let filePath: string | null = null;
      let fileName: string | null = null;
      let fileSize: number | null = null;
      let fileContentType: string | null = null;

      if (answer.type === "file" && answer.file) {
        if (!blobToken) {
          throw new Error(
            "File uploads are not configured. Set BLOB_READ_WRITE_TOKEN.",
          );
        }

        const arrayBuffer = await answer.file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const safeName =
          answer.file.name?.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9.\-_]/g, "") ||
          `upload-${Date.now()}`;
        const blobPath = `form-uploads/${form.id}/${response.id}-${Date.now()}-${safeName}`;

        const uploadResult = await put(blobPath, buffer, {
          access: "public",
          contentType: answer.file.type || "application/octet-stream",
          token: blobToken,
        });

        uploadedFiles.push(uploadResult.url);

        filePath = uploadResult.url;
        fileName = answer.file.name;
        fileSize = answer.file.size;
        fileContentType = answer.file.type || null;
      }

      await client.query<DbFormAnswerRow>(
        `INSERT INTO form_answers (
            response_id,
            question_id,
            value_text,
            value_number,
            value_boolean,
            value_date,
            value_json,
            file_path,
            file_name,
            file_size,
            file_content_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          response.id,
          answer.questionId,
          answer.valueText,
          answer.valueNumber,
          answer.valueBoolean,
          answer.valueDate,
          answer.valueJson ? JSON.stringify(answer.valueJson) : null,
          filePath,
          fileName,
          fileSize,
          fileContentType,
        ],
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      responseId: response.id,
      submittedAt: response.submitted_at.toISOString(),
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (blobToken && uploadedFiles.length > 0) {
      for (const fileUrl of uploadedFiles) {
        try {
          await del(fileUrl, { token: blobToken });
        } catch (cleanupError) {
          console.error("Failed to clean up uploaded file:", cleanupError);
        }
      }
    }

    console.error("Failed to record form submission:", error);
    return NextResponse.json(
      { error: "Failed to submit form" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
