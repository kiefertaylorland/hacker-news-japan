create table public.votes (
  user_id uuid not null references auth.users(id) on delete cascade,
  story_id text not null check (story_id ~ '^[1-9][0-9]*$'),
  created_at timestamptz not null default now(),
  primary key (user_id, story_id)
);
alter table public.votes enable row level security;
revoke all on public.votes from anon, authenticated;
grant select on public.votes to anon, authenticated;
grant insert on public.votes to authenticated;
create policy votes_read_own on public.votes for select to anon, authenticated using ((select auth.uid()) = user_id);
create policy votes_insert_own on public.votes for insert to authenticated with check ((select auth.uid()) = user_id);
create index votes_story_idx on public.votes (story_id);

-- Counts are public, but individual voters remain private. Only this aggregate
-- needs elevated access; the Data API entry point itself is security invoker.
create schema if not exists private;
grant usage on schema private to anon, authenticated;
create function private.story_vote_count(requested_story_id text)
returns bigint
language sql stable security definer
set search_path = ''
as $$
  select count(*) from public.votes where story_id = requested_story_id;
$$;
revoke all on function private.story_vote_count(text) from public;
grant execute on function private.story_vote_count(text) to anon, authenticated;

create function public.story_vote_count(requested_story_id text)
returns bigint
language sql stable security invoker
set search_path = ''
as $$
  select private.story_vote_count(requested_story_id);
$$;
revoke all on function public.story_vote_count(text) from public;
grant execute on function public.story_vote_count(text) to anon, authenticated;
