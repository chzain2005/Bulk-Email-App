import { Router } from "express";
import { supabaseAdmin } from "../config/supabaseClient.js";
import { requireAuth } from "../middleware/auth.js";
import { encryptSecret } from "../services/emailSender.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, from_name, smtp_host, smtp_port, smtp_user")
    .eq("id", req.user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    return res.status(500).json({ error: error.message });
  }
  res.json(data || null);
});

router.put("/", requireAuth, async (req, res) => {
  const { fullName, fromName, smtpHost, smtpPort, smtpUser, smtpPass } =
    req.body;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    return res
      .status(400)
      .json({ error: "smtpHost, smtpPort, smtpUser, smtpPass are required" });
  }

  const { error } = await supabaseAdmin.from("profiles").upsert({
    id: req.user.id,
    full_name: fullName,
    from_name: fromName,
    smtp_host: smtpHost,
    smtp_port: Number(smtpPort),
    smtp_user: smtpUser,
    smtp_pass_encrypted: encryptSecret(smtpPass),
  });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
