import nodemailer from "nodemailer";
import crypto from "crypto";

const ALGO = "aes-256-gcm";

function getKey() {
  const hex = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "CREDENTIALS_ENCRYPTION_KEY must be a 32-byte hex string (64 chars)",
    );
  }
  return Buffer.from(hex, "hex");
}

export function encryptSecret(plainText) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptSecret(payload) {
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
}

// Builds a nodemailer transporter from THIS user's own stored SMTP settings
// (their own Gmail App Password, or any other SMTP account they provide).
export function buildTransporter(profile) {
  return nodemailer.createTransport({
    host: profile.smtp_host,
    port: profile.smtp_port,
    secure: profile.smtp_port === 465,
    auth: {
      user: profile.smtp_user,
      pass: decryptSecret(profile.smtp_pass_encrypted),
    },
  });
}

export async function sendEmail(
  transporter,
  { fromName, fromEmail, to, subject, html, attachments },
) {
  return transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html,
    attachments,
  });
}
