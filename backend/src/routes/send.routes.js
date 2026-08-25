import { Router } from 'express';
import { supabaseAdmin } from '../config/supabaseClient.js';
import { requireAuth } from '../middleware/auth.js';
import { runCampaign } from '../services/queue.js';

const router = Router();

// POST /api/send/:campaignId — starts sending; returns immediately, progress via
// Supabase Realtime subscription to email_logs on the frontend.
router.post('/:campaignId', requireAuth, async (req, res) => {
  const { campaignId } = req.params;

  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select('id, status')
    .eq('id', campaignId)
    .eq('user_id', req.user.id)
    .single();

  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  if (campaign.status === 'sending') {
    return res.status(409).json({ error: 'Campaign is already sending' });
  }

  // Fire and forget — the queue writes status updates as it goes.
  runCampaign(campaignId).catch((err) => console.error('runCampaign failed:', err));

  res.json({ success: true, message: 'Campaign send started' });
});

export default router;
