-- =========================================================
-- Bulk Email App — Supabase schema
-- Run this in Supabase SQL Editor (or via CLI migration)
-- =========================================================

-- Auth is handled by Supabase Auth (auth.users). We attach extra
-- profile / SMTP settings to a public.profiles table keyed by user id.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  from_name text,                -- display name used as "From"
  smtp_host text,
  smtp_port int,
  smtp_user text,
  smtp_pass_encrypted text,      -- encrypted at rest by backend, never store plaintext
  created_at timestamptz default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  subject text not null,
  message_template text not null,   -- HTML/plain text with {name}, {email}, {custom} placeholders
  status text not null default 'draft', -- draft | queued | sending | completed | failed
  created_at timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table if not exists public.recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text,
  email text not null,
  custom_fields jsonb default '{}'::jsonb, -- any extra excel columns
  created_at timestamptz default now()
);

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  recipient_id uuid not null references public.recipients(id) on delete cascade,
  status text not null default 'queued', -- queued | sending | sent | failed
  error_message text,
  sent_at timestamptz,
  updated_at timestamptz default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  filename text not null,
  storage_path text not null,   -- path inside Supabase Storage bucket
  size_bytes bigint,
  created_at timestamptz default now()
);

-- =========================================================
-- Row Level Security — each user only sees their own data
-- =========================================================
alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.recipients enable row level security;
alter table public.email_logs enable row level security;
alter table public.attachments enable row level security;

create policy "Users manage their own profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users manage their own campaigns"
  on public.campaigns for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage recipients of their campaigns"
  on public.recipients for all
  using (exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid()));

create policy "Users manage logs of their campaigns"
  on public.email_logs for all
  using (exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid()));

create policy "Users manage attachments of their campaigns"
  on public.attachments for all
  using (exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid()));

-- Realtime: allow email_logs to broadcast changes to subscribed clients
alter publication supabase_realtime add table public.email_logs;

-- Storage bucket for attachments (create via dashboard or here):
-- insert into storage.buckets (id, name, public) values ('attachments', 'attachments', false);
