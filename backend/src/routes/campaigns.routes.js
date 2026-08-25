import { Router } from "express";
import { supabaseAdmin } from "../config/supabaseClient.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// POST /api/campaigns — create a draft campaign (subject + message template)
router.post("/", requireAuth, async (req, res) => {
  const { name, subject, messageTemplate } = req.body;
  if (!name || !subject || !messageTemplate) {
    return res
      .status(400)
      .json({ error: "name, subject, messageTemplate are required" });
  }

  const { data, error } = await supabaseAdmin
    .from("campaigns")
    .insert({
      user_id: req.user.id,
      name,
      subject,
      message_template: messageTemplate,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/campaigns — list current user's campaigns
router.get("/", requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("campaigns")
    .select("*")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/campaigns/:id — single campaign with recipient + log counts
router.get("/:id", requireAuth, async (req, res) => {
  const { data: campaign, error } = await supabaseAdmin
    .from("campaigns")
    .select("*")
    .eq("id", req.params.id)
    .eq("user_id", req.user.id)
    .single();

  if (error) return res.status(404).json({ error: "Campaign not found" });

  const { data: logs } = await supabaseAdmin
    .from("email_logs")
    .select("status, recipients(name, email)")
    .eq("campaign_id", req.params.id);

  res.json({ ...campaign, logs });
});

// PUT /api/campaigns/:id — edit a campaign (only allowed while status is 'draft')
router.put("/:id", requireAuth, async (req, res) => {
  const { name, subject, messageTemplate } = req.body;

  const { data: existing } = await supabaseAdmin
    .from("campaigns")
    .select("status")
    .eq("id", req.params.id)
    .eq("user_id", req.user.id)
    .single();

  if (!existing) return res.status(404).json({ error: "Campaign not found" });
  if (existing.status !== "draft") {
    return res
      .status(409)
      .json({ error: "Only draft campaigns can be edited" });
  }

  const { data, error } = await supabaseAdmin
    .from("campaigns")
    .update({ name, subject, message_template: messageTemplate })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/campaigns/:id — deletes the campaign and all related data
router.delete("/:id", requireAuth, async (req, res) => {
  const { data: campaign } = await supabaseAdmin
    .from("campaigns")
    .select("id")
    .eq("id", req.params.id)
    .eq("user_id", req.user.id)
    .single();

  if (!campaign) return res.status(404).json({ error: "Campaign not found" });

  const { data: attachmentRows } = await supabaseAdmin
    .from("attachments")
    .select("storage_path")
    .eq("campaign_id", req.params.id);

  if (attachmentRows && attachmentRows.length > 0) {
    const paths = attachmentRows.map((a) => a.storage_path);
    await supabaseAdmin.storage.from("attachments").remove(paths);
  }

  const { error } = await supabaseAdmin
    .from("campaigns")
    .delete()
    .eq("id", req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
