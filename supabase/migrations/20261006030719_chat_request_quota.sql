-- Shared across instances. Clients can consume their own quota but cannot reset it.
create schema if not exists private;
-- Preserve shared schema permissions: anonymous vote counts use private helpers.
-- Restrict this feature's tables and functions below instead.
grant usage on schema private to authenticated;

create table private.chat_request_quotas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  minute_started timestamptz not null,
  minute_count integer not null check (minute_count between 1 and 10),
  day date not null,
  day_count integer not null check (day_count between 1 and 100)
);
alter table private.chat_request_quotas enable row level security;
revoke all on private.chat_request_quotas from public, anon, authenticated;

create function private.consume_chat_quota()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  requested_at timestamptz := clock_timestamp();
  requested_day date := (requested_at at time zone 'UTC')::date;
begin
  if caller is null then return false; end if;
  -- ON CONFLICT locks the user's row, making concurrent requests atomic.
  insert into private.chat_request_quotas as q
    (user_id, minute_started, minute_count, day, day_count)
  values (caller, requested_at, 1, requested_day, 1)
  on conflict (user_id) do update set
    minute_started = case when q.minute_started <= requested_at - interval '60 seconds'
      then requested_at else q.minute_started end,
    minute_count = case when q.minute_started <= requested_at - interval '60 seconds'
      then 1 else q.minute_count + 1 end,
    day = greatest(q.day, requested_day),
    day_count = case when q.day < requested_day then 1 else q.day_count + 1 end
  where (q.minute_started <= requested_at - interval '60 seconds' or q.minute_count < 10)
    and (q.day < requested_day or q.day_count < 100);
  return found;
end;
$$;
revoke all on function private.consume_chat_quota() from public, anon;
grant execute on function private.consume_chat_quota() to authenticated;

-- Only the unprivileged wrapper is exposed through PostgREST.
create function public.consume_chat_quota()
returns boolean
language sql
security invoker
set search_path = ''
as $$ select private.consume_chat_quota(); $$;
revoke all on function public.consume_chat_quota() from public, anon;
grant execute on function public.consume_chat_quota() to authenticated;
