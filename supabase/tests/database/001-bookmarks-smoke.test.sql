begin;

select plan(2);

select has_table('public', 'bookmarks', 'bookmarks table should exist');

select results_eq(
  $$ select relrowsecurity from pg_class where oid = 'public.bookmarks'::regclass $$,
  $$ values (true) $$,
  'RLS should be enabled on public.bookmarks'
);

select * from finish();

rollback;
