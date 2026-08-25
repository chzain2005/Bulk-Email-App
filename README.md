# Dispatch — Bulk Email App 

React + Tailwind frontend, Node/Express backend, Supabase (auth + database +
storage + realtime). This is a working skeleton: auth, campaign create,
excel import with placeholders, attachment upload, throttled sending, and a
live status log. Not yet production-hardened — see "Next steps" below.

## 1. Supabase setup
1. Create a project at supabase.com.
2. Open the SQL editor and run `supabase/schema.sql`.
3. Storage → create a bucket named `attachments` (private).
4. Project Settings → API: copy the `Project URL`, `anon public` key, and
   `service_role` key.
5. Authentication → Providers: email/password is enabled by default.

## 2. Backend
```bash
cd backend
cp .env.example .env      # fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # -> CREDENTIALS_ENCRYPTION_KEY
npm install
npm run dev                # http://localhost:5000
```

## 3. Frontend
```bash
cd frontend
cp .env.example .env       # fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm install
npm run dev                # http://localhost:5173
```

## How placeholders work
Anything in `{brackets}` in the subject or message is replaced per-recipient.
`{name}` and `{email}` always work; any other Excel column header (e.g.
`{company}`) becomes a placeholder too, matched case-insensitively.

## Flow
1. Sign up, then go to **Settings** and connect your SMTP account (Gmail
   app password, Outlook, or any SMTP provider).
2. **Compose** a campaign: subject, message with placeholders, upload the
   recipients Excel file (`name`, `email` + any extra columns), optionally
   attach files.
3. Open the campaign and hit **Send campaign**. The log updates in real
   time via Supabase Realtime as each email moves queued → sending →
   sent/failed.

## Next steps / production hardening
- **Queue**: `backend/src/services/queue.js` is an in-process loop — fine
  for testing, but swap it for **BullMQ + Redis** so sends survive server
  restarts and scale across workers.
- **Deliverability**: raw SMTP from Gmail/Outlook will get rate-limited or
  flagged fast at real volume. Consider a transactional provider (Resend,
  SendGrid, Postmark) behind the same `emailSender.js` interface.
- **Attachments**: `queue.js` currently passes the raw storage path to
  nodemailer — before going live, generate a signed URL (or download the
  buffer) from Supabase Storage first.
- **OAuth**: for Gmail/Outlook, prefer OAuth2 over app passwords where
  possible — better security, no "less secure app" friction.
- **Unsubscribe / compliance**: add an unsubscribe link and suppression
  list before sending real marketing volume (CAN-SPAM / GDPR).
