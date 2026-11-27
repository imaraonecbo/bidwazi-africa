-- Additive foundation for the global digital-work and innovation platform.
-- No existing tables, Auth users, Storage buckets, or credentials are removed.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.company_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','operations','reviewer','finance')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.worker_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  country_code text not null default 'KE' check (country_code ~ '^[A-Z]{2}$'),
  city text,
  timezone text not null default 'Africa/Nairobi',
  bio text not null default '',
  portfolio_url text,
  availability text not null default 'available' check (availability in ('available','busy','unavailable')),
  profile_visibility text not null default 'private' check (profile_visibility in ('private','public')),
  account_state text not null default 'active' check (account_state in ('active','restricted','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.skills (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  category text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.worker_skills (
  user_id uuid not null references public.worker_profiles(user_id) on delete cascade,
  skill_id bigint not null references public.skills(id) on delete restrict,
  proficiency text not null default 'beginner' check (proficiency in ('beginner','intermediate','advanced','expert')),
  years_experience numeric(4,1) not null default 0 check (years_experience >= 0 and years_experience <= 80),
  created_at timestamptz not null default now(),
  primary key (user_id, skill_id)
);

create table if not exists public.work_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null default '',
  source_type text not null check (source_type in ('client_contract','company_product','innovation')),
  status text not null default 'draft' check (status in ('draft','funded','active','completed','cancelled')),
  funding_state text not null default 'unverified' check (funding_state in ('unverified','secured','cancelled')),
  currency char(3) not null default 'KES',
  total_budget_minor bigint not null default 0 check (total_budget_minor >= 0),
  contributor_budget_minor bigint not null default 0 check (contributor_budget_minor >= 0 and contributor_budget_minor <= total_budget_minor),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.work_opportunities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.work_projects(id) on delete restrict,
  title text not null,
  summary text not null default '',
  instructions text not null default '',
  category text not null,
  required_skills jsonb not null default '[]'::jsonb check (jsonb_typeof(required_skills) = 'array'),
  quality_criteria jsonb not null default '[]'::jsonb check (jsonb_typeof(quality_criteria) = 'array'),
  eligible_countries text[] not null default '{}',
  pay_amount_minor bigint not null check (pay_amount_minor > 0),
  currency char(3) not null default 'KES',
  pay_basis text not null default 'per_task' check (pay_basis in ('per_task','per_unit','per_hour','fixed')),
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes > 0),
  slots_total integer not null default 1 check (slots_total > 0),
  slots_claimed integer not null default 0 check (slots_claimed >= 0 and slots_claimed <= slots_total),
  status text not null default 'draft' check (status in ('draft','open','paused','closed')),
  funding_state text not null default 'unverified' check (funding_state in ('unverified','secured','cancelled')),
  available_from timestamptz,
  deadline_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (deadline_at is null or available_from is null or deadline_at > available_from)
);

create table if not exists public.work_assignments (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.work_opportunities(id) on delete restrict,
  contributor_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'claimed' check (status in ('claimed','in_progress','submitted','revision_required','accepted','rejected','paid','cancelled')),
  agreed_amount_minor bigint not null default 0 check (agreed_amount_minor >= 0),
  currency char(3) not null default 'KES',
  claimed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, contributor_id)
);

create table if not exists public.work_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.work_assignments(id) on delete restrict,
  contributor_id uuid not null references auth.users(id) on delete restrict,
  version integer not null default 1 check (version > 0),
  submission_text text not null default '',
  deliverable_url text,
  storage_path text,
  status text not null default 'submitted' check (status in ('submitted','under_review','revision_required','accepted','rejected')),
  submitted_at timestamptz not null default now(),
  unique (assignment_id, version),
  check (length(trim(submission_text)) > 0 or deliverable_url is not null or storage_path is not null)
);

create table if not exists public.worker_earnings_ledger (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid not null references auth.users(id) on delete restrict,
  assignment_id uuid references public.work_assignments(id) on delete restrict,
  entry_type text not null check (entry_type in ('credit','debit')),
  reason text not null check (reason in ('work_accepted','manual_adjustment','payout_reserved','payout_sent','reversal')),
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null default 'KES',
  reference text,
  created_at timestamptz not null default now()
);

create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid not null references auth.users(id) on delete restrict,
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null default 'KES',
  payout_method text not null check (payout_method in ('mpesa','bank_transfer','paypal','other')),
  status text not null default 'requested' check (status in ('requested','under_review','approved','processing','paid','rejected','cancelled')),
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.idea_submissions (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid not null references auth.users(id) on delete restrict,
  title text not null,
  problem text not null,
  proposed_solution text not null,
  category text not null default 'other',
  status text not null default 'received' check (status in ('received','under_review','shortlisted','in_development','declined','withdrawn')),
  submitted_at timestamptz not null default now()
);

create table if not exists public.work_review_events (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.work_assignments(id) on delete restrict,
  reviewer_id uuid references auth.users(id),
  event_type text not null check (event_type in ('accepted','revision_requested','rejected','status_changed','note')),
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists worker_skills_skill_id_idx on public.worker_skills(skill_id);
create index if not exists work_opportunities_public_idx on public.work_opportunities(status, funding_state, available_from, deadline_at);
create index if not exists work_opportunities_project_id_idx on public.work_opportunities(project_id);
create index if not exists work_assignments_contributor_idx on public.work_assignments(contributor_id, claimed_at desc);
create index if not exists work_submissions_assignment_idx on public.work_submissions(assignment_id, version desc);
create index if not exists worker_earnings_contributor_idx on public.worker_earnings_ledger(contributor_id, created_at desc);
create index if not exists payout_requests_contributor_idx on public.payout_requests(contributor_id, requested_at desc);
create index if not exists idea_submissions_contributor_idx on public.idea_submissions(contributor_id, submitted_at desc);

alter table public.company_memberships enable row level security;
alter table public.worker_profiles enable row level security;
alter table public.skills enable row level security;
alter table public.worker_skills enable row level security;
alter table public.work_projects enable row level security;
alter table public.work_opportunities enable row level security;
alter table public.work_assignments enable row level security;
alter table public.work_submissions enable row level security;
alter table public.worker_earnings_ledger enable row level security;
alter table public.payout_requests enable row level security;
alter table public.idea_submissions enable row level security;
alter table public.work_review_events enable row level security;

-- Revoke the project's broad existing default table grants; explicitly grant only required access.
revoke all on table public.company_memberships, public.worker_profiles, public.skills, public.worker_skills,
  public.work_projects, public.work_opportunities, public.work_assignments, public.work_submissions,
  public.worker_earnings_ledger, public.payout_requests, public.idea_submissions, public.work_review_events
  from anon, authenticated;
grant all on table public.company_memberships, public.work_projects, public.work_review_events to service_role;
grant select on table public.worker_profiles, public.skills, public.worker_skills,
  public.work_opportunities to anon, authenticated;
grant select, insert, update on table public.worker_profiles to authenticated;
grant select, insert, update, delete on table public.worker_skills to authenticated;
grant select, insert on table public.work_assignments, public.work_submissions,
  public.payout_requests, public.idea_submissions to authenticated;
grant select on table public.worker_earnings_ledger to authenticated;

drop policy if exists worker_profiles_public_read on public.worker_profiles;
create policy worker_profiles_public_read on public.worker_profiles
  for select to anon, authenticated using (profile_visibility = 'public' and account_state = 'active');
drop policy if exists worker_profiles_owner_read on public.worker_profiles;
create policy worker_profiles_owner_read on public.worker_profiles
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists worker_profiles_owner_insert on public.worker_profiles;
create policy worker_profiles_owner_insert on public.worker_profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists worker_profiles_owner_update on public.worker_profiles;
create policy worker_profiles_owner_update on public.worker_profiles
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists skills_active_read on public.skills;
create policy skills_active_read on public.skills for select to anon, authenticated using (is_active = true);

drop policy if exists worker_skills_public_read on public.worker_skills;
create policy worker_skills_public_read on public.worker_skills
  for select to anon, authenticated using (
    exists (
      select 1 from public.worker_profiles p
      where p.user_id = worker_skills.user_id
        and p.profile_visibility = 'public'
        and p.account_state = 'active'
    )
  );
drop policy if exists worker_skills_owner_read on public.worker_skills;
create policy worker_skills_owner_read on public.worker_skills
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists worker_skills_owner_insert on public.worker_skills;
create policy worker_skills_owner_insert on public.worker_skills
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists worker_skills_owner_update on public.worker_skills;
create policy worker_skills_owner_update on public.worker_skills
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists worker_skills_owner_delete on public.worker_skills;
create policy worker_skills_owner_delete on public.worker_skills
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists work_opportunities_public_read on public.work_opportunities;
create policy work_opportunities_public_read on public.work_opportunities
  for select to anon, authenticated using (
    status = 'open'
    and funding_state = 'secured'
    and (available_from is null or available_from <= now())
    and (deadline_at is null or deadline_at > now())
    and slots_claimed < slots_total
  );

drop policy if exists work_assignments_owner_read on public.work_assignments;
create policy work_assignments_owner_read on public.work_assignments
  for select to authenticated using ((select auth.uid()) = contributor_id);
drop policy if exists work_assignments_owner_insert on public.work_assignments;
create policy work_assignments_owner_insert on public.work_assignments
  for insert to authenticated with check ((select auth.uid()) = contributor_id);

drop policy if exists work_submissions_owner_read on public.work_submissions;
create policy work_submissions_owner_read on public.work_submissions
  for select to authenticated using ((select auth.uid()) = contributor_id);
drop policy if exists work_submissions_owner_insert on public.work_submissions;
create policy work_submissions_owner_insert on public.work_submissions
  for insert to authenticated with check ((select auth.uid()) = contributor_id);

drop policy if exists worker_earnings_owner_read on public.worker_earnings_ledger;
create policy worker_earnings_owner_read on public.worker_earnings_ledger
  for select to authenticated using ((select auth.uid()) = contributor_id);

drop policy if exists payout_requests_owner_read on public.payout_requests;
create policy payout_requests_owner_read on public.payout_requests
  for select to authenticated using ((select auth.uid()) = contributor_id);
drop policy if exists payout_requests_owner_insert on public.payout_requests;
create policy payout_requests_owner_insert on public.payout_requests
  for insert to authenticated with check ((select auth.uid()) = contributor_id and status = 'requested');

drop policy if exists idea_submissions_owner_read on public.idea_submissions;
create policy idea_submissions_owner_read on public.idea_submissions
  for select to authenticated using ((select auth.uid()) = contributor_id);
drop policy if exists idea_submissions_owner_insert on public.idea_submissions;
create policy idea_submissions_owner_insert on public.idea_submissions
  for insert to authenticated with check ((select auth.uid()) = contributor_id and status = 'received');

-- Internal slot reservation runs only as a trigger. The function is not an exposed RPC.
create or replace function private.reserve_work_slot()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_pay bigint;
  v_currency char(3);
  v_country text;
begin
  if auth.uid() is null or auth.uid() <> new.contributor_id then
    raise exception 'You can only claim work for your own signed-in account';
  end if;

  select country_code into v_country
  from public.worker_profiles
  where user_id = auth.uid() and account_state = 'active';

  if not found then
    raise exception 'Complete an active contributor profile before claiming work';
  end if;

  update public.work_opportunities o
  set slots_claimed = o.slots_claimed + 1,
      updated_at = now()
  where o.id = new.opportunity_id
    and o.status = 'open'
    and o.funding_state = 'secured'
    and (o.available_from is null or o.available_from <= now())
    and (o.deadline_at is null or o.deadline_at > now())
    and o.slots_claimed < o.slots_total
    and (cardinality(o.eligible_countries) = 0 or v_country = any(o.eligible_countries))
  returning o.pay_amount_minor, o.currency into v_pay, v_currency;

  if not found then
    raise exception 'This opportunity is unavailable, not funded, full, expired or not open in your country';
  end if;

  new.agreed_amount_minor := v_pay;
  new.currency := v_currency;
  new.status := 'claimed';
  new.claimed_at := now();
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.reserve_work_slot() from public, anon, authenticated;
drop trigger if exists reserve_work_slot_before_insert on public.work_assignments;
create trigger reserve_work_slot_before_insert
  before insert on public.work_assignments
  for each row execute function private.reserve_work_slot();

create or replace function private.prepare_work_submission()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_status text;
  v_next_version integer;
begin
  if auth.uid() is null or auth.uid() <> new.contributor_id then
    raise exception 'You can only submit work for your own signed-in account';
  end if;

  select a.status into v_status
  from public.work_assignments a
  where a.id = new.assignment_id and a.contributor_id = auth.uid()
  for update;

  if not found or v_status not in ('claimed','in_progress','revision_required') then
    raise exception 'This assignment is not accepting a submission';
  end if;

  select coalesce(max(s.version), 0) + 1 into v_next_version
  from public.work_submissions s
  where s.assignment_id = new.assignment_id;

  new.version := v_next_version;
  new.contributor_id := auth.uid();
  new.status := 'submitted';
  new.submitted_at := now();
  return new;
end;
$$;

revoke all on function private.prepare_work_submission() from public, anon, authenticated;
drop trigger if exists prepare_work_submission_before_insert on public.work_submissions;
create trigger prepare_work_submission_before_insert
  before insert on public.work_submissions
  for each row execute function private.prepare_work_submission();

insert into public.skills (slug, name, category) values
  ('ai-data-annotation','AI Data Annotation','AI & Data Operations'),
  ('llm-evaluation','AI Model Evaluation','AI & Data Operations'),
  ('kiswahili-localisation','Kiswahili Localisation','Language & Content'),
  ('transcription-review','Transcription Review','Language & Content'),
  ('quality-assurance-testing','Software QA Testing','Software & Technology'),
  ('bug-reporting','Bug Reporting','Software & Technology'),
  ('web-research','Web Research','Research & Operations'),
  ('data-cleaning','Data Cleaning','Research & Operations'),
  ('spreadsheet-verification','Spreadsheet Verification','Research & Operations'),
  ('frontend-development','Frontend Development','Software & Technology'),
  ('javascript','JavaScript','Software & Technology'),
  ('website-maintenance','Website Maintenance','Software & Technology'),
  ('technical-documentation','Technical Documentation','Language & Content'),
  ('customer-support','Customer Support','Business Operations'),
  ('content-operations','Content Operations','Language & Content'),
  ('graphic-design','Graphic Design','Creative Production'),
  ('video-editing','Video Editing','Creative Production'),
  ('translation','Translation','Language & Content')
on conflict (slug) do update set name = excluded.name, category = excluded.category, is_active = true;

comment on table public.worker_profiles is 'Contributor account profile for the global digital-work network.';
comment on table public.work_projects is 'Company-controlled client, internal product and innovation projects with budget and funding state.';
comment on table public.work_opportunities is 'Only opportunities marked open and secured are visible as paid work to the public.';
comment on table public.work_assignments is 'Contributor claims with an immutable agreed-pay snapshot and a database-enforced capacity reservation.';
comment on table public.work_submissions is 'Versioned contributor deliverables tied to a claimed assignment.';
comment on table public.worker_earnings_ledger is 'Read-only-to-contributors financial ledger; only trusted server operations write entries.';
comment on table public.payout_requests is 'Contributor payout requests; actual disbursement requires authorised finance processing.';
comment on table public.idea_submissions is 'Private idea submissions from contributors for company review.';
