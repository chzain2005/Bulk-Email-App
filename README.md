# Dispatch — Bulk Email App 

React + Tailwind frontend, Node/Express backend, Supabase (auth + database +
storage + realtime). This is a working skeleton: auth, campaign create,
excel import with placeholders, attachment upload, throttled sending, and a
live status log. Not yet production-hardened — see "Next steps" below.


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


