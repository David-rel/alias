import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT
  ? Number.parseInt(process.env.SMTP_PORT, 10)
  : undefined;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const gmailUser = process.env.GMAIL_USER;
const gmailPass = process.env.GMAIL_PASS;
const emailFrom =
  process.env.EMAIL_FROM ?? smtpUser ?? gmailUser ?? undefined;

let transporter: nodemailer.Transporter | null = null;

function createTransporter(): nodemailer.Transporter {
  if (gmailUser && gmailPass) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });
  }

  if (smtpHost && smtpUser && smtpPass) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort ?? 587,
      secure: (smtpPort ?? 587) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  throw new Error(
    "Email transport is not fully configured. Provide Gmail or SMTP credentials.",
  );
}

function getTransporter() {
  if (!transporter) {
    transporter = createTransporter();
  }

  return transporter;
}

function baseUrl() {
  const fallback = "http://localhost:3000";
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : undefined);

  return (envUrl ?? fallback).replace(/\/$/, "");
}

export function emailDeliveryConfigured() {
  return Boolean(
    (gmailUser && gmailPass) || (smtpHost && smtpUser && smtpPass),
  );
}

type VerificationEmailPayload = {
  recipient: string;
  code: string;
};

export async function sendVerificationEmail({
  recipient,
  code,
}: VerificationEmailPayload) {
  const verifyUrl = `${baseUrl()}/auth/verify?code=${encodeURIComponent(code)}`;
  const fromAddress = emailFrom ?? gmailUser ?? smtpUser ?? "no-reply@alias.app";

  if (!emailDeliveryConfigured()) {
    console.warn(
      "[email] Delivery skipped – configure GMAIL_USER/GMAIL_PASS or SMTP_HOST/SMTP_USER/SMTP_PASS to enable sending.",
    );
    console.info(`[email] Verification link for ${recipient}: ${verifyUrl}`);
    return;
  }

  const transport = getTransporter();

  await transport.sendMail({
    from: fromAddress,
    to: recipient,
    subject: "Verify your Alias account",
    text: [
      "Welcome to Alias!",
      "",
      "Confirm your email address to activate your account:",
      verifyUrl,
      "",
      "If you didn't create an Alias account you can safely ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family: sans-serif; line-height: 1.5; color: #0f172a;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">Welcome to Alias</h1>
        <p style="margin: 0 0 16px;">Confirm your email address to activate your account.</p>
        <p style="margin: 0 0 24px;">
          <a href="${verifyUrl}" style="display: inline-block; padding: 12px 20px; border-radius: 999px; background: linear-gradient(90deg,#0064d6,#23a5fe,#3eb6fd); text-decoration: none; color: #0b1120; font-weight: 600;">
            Verify email
          </a>
        </p>
        <p style="margin: 0;">
          Or copy and paste this link into your browser:<br/>
          <a href="${verifyUrl}">${verifyUrl}</a>
        </p>
        <p style="margin-top: 24px; font-size: 12px; color: #475569;">
          If you didn't create an Alias account you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

type PasswordResetEmailPayload = {
  recipient: string;
  code: string;
};

export async function sendPasswordResetEmail({
  recipient,
  code,
}: PasswordResetEmailPayload) {
  const resetUrl = `${baseUrl()}/auth/reset?code=${encodeURIComponent(code)}`;
  const fromAddress = emailFrom ?? gmailUser ?? smtpUser ?? "no-reply@alias.app";

  if (!emailDeliveryConfigured()) {
    console.warn(
      "[email] Delivery skipped – configure GMAIL_USER/GMAIL_PASS or SMTP_HOST/SMTP_USER/SMTP_PASS to enable sending.",
    );
    console.info(`[email] Password reset link for ${recipient}: ${resetUrl}`);
    return;
  }

  const transport = getTransporter();

  await transport.sendMail({
    from: fromAddress,
    to: recipient,
    subject: "Reset your Alias password",
    text: [
      "We received a request to reset your Alias password.",
      "",
      "Use the link below to choose a new password. This link is valid for 1 hour.",
      resetUrl,
      "",
      "If you didn't request this reset you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family: sans-serif; line-height: 1.5; color: #0f172a;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">Reset your password</h1>
        <p style="margin: 0 0 16px;">Use the button below to choose a new password. This link expires in 1 hour.</p>
        <p style="margin: 0 0 24px;">
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 20px; border-radius: 999px; background: linear-gradient(90deg,#0064d6,#23a5fe,#3eb6fd); text-decoration: none; color: #0b1120; font-weight: 600;">
            Reset password
          </a>
        </p>
        <p style="margin: 0;">
          Or copy and paste this link into your browser:<br/>
          <a href="${resetUrl}">${resetUrl}</a>
        </p>
        <p style="margin-top: 24px; font-size: 12px; color: #475569;">
          If you didn't request this reset you can ignore this email.
        </p>
      </div>
    `,
  });
}
