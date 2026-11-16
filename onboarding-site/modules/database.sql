-- The modules page's part of the database (onboarding-site/modules/README.md).
-- PROPOSED on 16 Nov 2026, NOT APPLIED: each numbered block needs Yohann's yes before it is run (Supabase, project
-- "Website Generator"). When a block is applied, write the date here. Nothing in this file is secret; the owner's email
-- is not written in it (the repo is public): put it in place of <the owner's email> when running block 1.

-- 1. Who the owner is. One row, his account's id. Nobody reads or writes the table through the site; is_owner() only
--    answers yes or no about the account that asks.
create table public.owners (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.owners enable row level security;
revoke all on table public.owners from anon, authenticated;
insert into public.owners (user_id) select id from auth.users where email = '<the owner''s email>';

create function public.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.owners o where o.user_id = (select auth.uid()));
$$;
revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to anon, authenticated;

-- 2. The owner's switches: a part of a module, on or off in a country, with a short note. Only what differs from, or
--    confirms, the code's list (engine/src/modules/available.json) is a row. The owner alone reads and writes the table.
--    module_switches_public() is for the next step, when the maker must know a switch without a login: it gives the
--    switches and never the notes.
create table public.module_switches (
  module text not null check (module ~ '^[a-z][a-z0-9-]*$'),
  part text not null check (part ~ '^[a-z][a-z0-9-]*$'),
  country text not null check (country ~ '^[A-Z]{2}$'),
  is_on boolean not null,
  note text not null default '' check (length(note) <= 300),
  updated_at timestamptz not null default now(),
  primary key (module, part, country)
);
alter table public.module_switches enable row level security;
revoke all on table public.module_switches from anon;
create policy "owner reads and writes module switches" on public.module_switches
  for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));

create function public.module_switches_public() returns table (module text, part text, country text, is_on boolean)
language sql stable security definer set search_path = '' as $$
  select s.module, s.part, s.country, s.is_on from public.module_switches s;
$$;
revoke all on function public.module_switches_public() from public;
grant execute on function public.module_switches_public() to anon, authenticated;

-- 3. The owner's feedback: his words with what he was looking at (seen: step, guest page, house, language, width), for
--    the module's conversation, or the main one when across is true. The main conversation reads what is new with its
--    own access to the database and marks it handed out. The owner alone reads and writes it through the site.
create table public.module_feedback (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  module text not null check (module ~ '^[a-z][a-z0-9-]*$'),
  part text check (part is null or part ~ '^[a-z][a-z0-9-]*$'),
  words text not null check (length(words) between 1 and 4000),
  across boolean not null default false,
  seen jsonb not null default '{}'::jsonb,
  state text not null default 'new' check (state in ('new', 'handed_out', 'done')),
  state_at timestamptz
);
alter table public.module_feedback enable row level security;
revoke all on table public.module_feedback from anon;
create policy "owner reads and writes module feedback" on public.module_feedback
  for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));

-- 4. Sample houses: guides of the owner whose web address starts with "sample-". Two guards, whoever asks: one is
--    never published (guests never see it as a real guide), and none starts a search that costs money (every job but
--    the taxis of our open directory, which is free).
create function public.guard_sample_house() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'published' and new.slug like 'sample-%'
     and exists (select 1 from public.owners o where o.user_id = new.owner) then
    raise exception 'A sample house is never published.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger guides_guard_sample before insert or update on public.guides
  for each row execute function public.guard_sample_house();

create function public.guard_sample_job() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.guides g join public.owners o on o.user_id = g.owner
             where g.id = new.guide_id and g.slug like 'sample-%')
     and not (new.kind = 'find-transport' and new.params ->> 'what' = 'taxis') then
    raise exception 'A sample house starts no paid search.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger guide_jobs_guard_sample before insert on public.guide_jobs
  for each row execute function public.guard_sample_job();

-- 5. The sample houses themselves: three empty rows of the owner's, edited directly like an imported guide, never
--    built from answers. The page's "Reset the house" fills each from its fixture (samples/<slug>.json).
insert into public.guides (owner, slug, origin, status)
select o.user_id, s.slug, 'imported', 'draft'
from public.owners o, (values ('sample-city'), ('sample-coast'), ('sample-village')) as s (slug);
