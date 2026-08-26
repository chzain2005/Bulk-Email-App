import { supabaseAdmin } from "../config/supabaseClient.js";
import { buildTransporter, sendEmail } from "./emailSender.js";
import { fillTemplate } from "../utils/placeholder.js";

// -----------------------------------------------------------------------
// NOTE: This is a minimal in-process queue, good enough for a single
// backend instance and moderate volumes. For production / multi-instance
// deployments, swap this for BullMQ + Redis: each recipient becomes a
// job, workers pull from Redis, and this same status-update logic runs
// inside the worker instead of a for-loop.
// -----------------------------------------------------------------------

const RATE_PER_SECOND = Number(process.env.SEND_RATE_PER_SECOND || 1);
const DELAY_MS = Math.max(1000 / RATE_PER_SECOND, 200);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function updateLogStatus(logId, status, errorMessage = null) {
  await supabaseAdmin
    .from("email_logs")
    .update({
      status,
      error_message: errorMessage,
      sent_at: status === "sent" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", logId);
}

// Downloads every campaign attachment from Supabase Storage once, up front,
// and returns nodemailer-ready attachment objects (in-memory buffers).
// Nodemailer can't read a Supabase Storage path directly (it's not a local
// file), so we resolve the actual bytes here instead.
async function resolveAttachments(attachmentRows) {
  const resolved = [];
  for (const a of attachmentRows || []) {
    const { data, error } = await supabaseAdmin.storage
      .from("attachments")
      .download(a.storage_path);

    if (error) {
      console.error(
        `Failed to download attachment ${a.filename}:`,
        error.message,
      );
      continue;
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    resolved.push({ filename: a.filename, content: buffer });
  }
  return resolved;
}

export async function runCampaign(campaignId) {
  const { data: campaign } = await supabaseAdmin
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (!campaign) return;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", campaign.user_id)
    .single();

  const { data: logs } = await supabaseAdmin
    .from("email_logs")
    .select("*, recipients(*)")
    .eq("campaign_id", campaignId)
    .eq("status", "queued");

  const { data: attachmentRows } = await supabaseAdmin
    .from("attachments")
    .select("*")
    .eq("campaign_id", campaignId);

  const attachments = await resolveAttachments(attachmentRows);
  const transporter = buildTransporter(profile);

  await supabaseAdmin
    .from("campaigns")
    .update({ status: "sending", started_at: new Date().toISOString() })
    .eq("id", campaignId);

  for (const log of logs) {
    const recipient = log.recipients;
    await updateLogStatus(log.id, "sending");

    try {
      const subject = fillTemplate(campaign.subject, recipient);
      const filled = fillTemplate(campaign.message_template, recipient);
      const html = `<div style="font-family: sans-serif; font-size: 14px; line-height: 1.6;">${filled}</div>`;

      await sendEmail(transporter, {
        fromName: profile.from_name || profile.full_name || "Sender",
        fromEmail: profile.smtp_user,
        to: recipient.email,
        subject,
        html,
        attachments,
      });

      await updateLogStatus(log.id, "sent");
    } catch (err) {
      await updateLogStatus(log.id, "failed", err.message);
    }

    await sleep(DELAY_MS);
  }

  await supabaseAdmin
    .from("campaigns")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", campaignId);
}
