create table public.comments (
  id uuid primary key default gen_random_uuid(),
  story_id text not null check (story_id ~ '^[1-9][0-9]*$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  author text not null,
  body text not null check (length(btrim(body)) between 1 and 10000),
  created_at timestamptz not null default now()
);
alter table public.comments enable row level security;
revoke all on public.comments from anon, authenticated;
grant select on public.comments to anon, authenticated;
grant insert on public.comments to authenticated;
create policy comments_read on public.comments for select to anon, authenticated using (true);
create policy comments_insert_own on public.comments
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and author = (
      select p.display_name
      from public.profiles p
      where p.id = (select auth.uid())
    )
  );
create index comments_story_created_idx on public.comments (story_id, created_at);
create index comments_user_idx on public.comments (user_id);
