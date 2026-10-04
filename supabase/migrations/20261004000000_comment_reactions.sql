-- Upvotes and favorites on Hacker News Japan comments. Both are private to the
-- user who made them, like upvotes and favorites on a user's own HN profile.
create table public.comment_votes (
  user_id uuid not null references auth.users(id) on delete cascade,
  comment_id uuid not null references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, comment_id)
);
alter table public.comment_votes enable row level security;
revoke all on public.comment_votes from anon, authenticated;
grant select, insert on public.comment_votes to authenticated;
create policy comment_votes_read_own on public.comment_votes for select to authenticated using ((select auth.uid()) = user_id);
create policy comment_votes_insert_own on public.comment_votes for insert to authenticated with check ((select auth.uid()) = user_id);
create index comment_votes_comment_idx on public.comment_votes (comment_id);
create index comment_votes_user_created_idx on public.comment_votes (user_id, created_at desc);

create table public.comment_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  comment_id uuid not null references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, comment_id)
);
alter table public.comment_favorites enable row level security;
revoke all on public.comment_favorites from anon, authenticated;
grant select, insert, delete on public.comment_favorites to authenticated;
create policy comment_favorites_read_own on public.comment_favorites for select to authenticated using ((select auth.uid()) = user_id);
create policy comment_favorites_insert_own on public.comment_favorites for insert to authenticated with check ((select auth.uid()) = user_id);
create policy comment_favorites_delete_own on public.comment_favorites for delete to authenticated using ((select auth.uid()) = user_id);
create index comment_favorites_comment_idx on public.comment_favorites (comment_id);
create index comment_favorites_user_created_idx on public.comment_favorites (user_id, created_at desc);
