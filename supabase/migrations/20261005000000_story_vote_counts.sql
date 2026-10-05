-- Batched vote counts so a page of stories loads its counts in one Data API
-- call instead of one per story. Same privilege split as story_vote_count.
create function private.story_vote_counts(requested_story_ids text[])
returns table (story_id text, count bigint)
language sql stable security definer
set search_path = ''
as $$
  select votes.story_id, count(*) from public.votes
  where votes.story_id = any(requested_story_ids)
  group by votes.story_id;
$$;
revoke all on function private.story_vote_counts(text[]) from public;
grant execute on function private.story_vote_counts(text[]) to anon, authenticated;

create function public.story_vote_counts(requested_story_ids text[])
returns table (story_id text, count bigint)
language sql stable security invoker
set search_path = ''
as $$
  select * from private.story_vote_counts(requested_story_ids);
$$;
revoke all on function public.story_vote_counts(text[]) from public;
grant execute on function public.story_vote_counts(text[]) to anon, authenticated;
