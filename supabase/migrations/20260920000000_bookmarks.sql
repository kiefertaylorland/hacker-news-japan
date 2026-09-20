create table public.bookmarks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  object_id     text not null,
  title         text not null,
  url           text,
  author        text not null,
  points        integer,
  num_comments  integer,
  created_at_i  integer not null,
  tags          text[] not null default '{}',
  saved_at      timestamptz not null default now(),
  unique (user_id, object_id)
);

alter table public.bookmarks enable row level security;

create policy "bookmarks_select_own" on public.bookmarks
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "bookmarks_insert_own" on public.bookmarks
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "bookmarks_delete_own" on public.bookmarks
  for delete to authenticated using ((select auth.uid()) = user_id);

create index bookmarks_user_saved_idx on public.bookmarks (user_id, saved_at desc);
