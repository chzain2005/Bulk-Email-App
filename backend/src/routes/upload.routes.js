import { Router } from 'express';
import multer from 'multer';
import { supabaseAdmin } from '../config/supabaseClient.js';
import { requireAuth } from '../middleware/auth.js';
import { parseRecipientsFromExcel } from '../services/excelParser.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const router = Router();

// POST /api/upload/recipients/:campaignId — parse excel, insert recipients + matching queued email_logs
router.post('/recipients/:campaignId', requireAuth, upload.single('file'), async (req, res) => {
  const { campaignId } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { recipients, errors } = parseRecipientsFromExcel(req.file.buffer);
  if (recipients.length === 0) {
    return res.status(400).json({ error: 'No valid rows found', details: errors });
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('recipients')
    .insert(recipients.map((r) => ({ ...r, campaign_id: campaignId })))
    .select();

  if (insertError) return res.status(500).json({ error: insertError.message });

  const logRows = inserted.map((r) => ({
    campaign_id: campaignId,
    recipient_id: r.id,
    status: 'queued',
  }));
  const { error: logError } = await supabaseAdmin.from('email_logs').insert(logRows);
  if (logError) return res.status(500).json({ error: logError.message });

  res.json({ imported: inserted.length, skipped: errors.length, errors });
});

// POST /api/upload/attachment/:campaignId — any file (doc, image, video, etc) to Supabase Storage
router.post('/attachment/:campaignId', requireAuth, upload.single('file'), async (req, res) => {
  const { campaignId } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const storagePath = `${req.user.id}/${campaignId}/${Date.now()}-${req.file.originalname}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from('attachments')
    .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype });

  if (uploadError) return res.status(500).json({ error: uploadError.message });

  const { data, error } = await supabaseAdmin
    .from('attachments')
    .insert({
      campaign_id: campaignId,
      filename: req.file.originalname,
      storage_path: storagePath,
      size_bytes: req.file.size,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
