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
create policy votes_read on public.votes for select to anon, authenticated using (true);
create policy votes_insert_own on public.votes for insert to authenticated with check ((select auth.uid()) = user_id);
create index votes_story_idx on public.votes (story_id);
