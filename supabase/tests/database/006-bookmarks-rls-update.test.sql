begin;

select plan(1);

select tests.create_supabase_user('user-a@example.com') as user_a_id \gset

insert into public.bookmarks (user_id, object_id, title, author, created_at_i)
values (:'user_a_id', 'story-a', 'Story A', 'author-a', 1000);

select tests.authenticate_as(:'user_a_id'::uuid);

-- There is no UPDATE policy on bookmarks: even the owner cannot update their
-- own row. This guards against a future migration silently adding update
-- access without an explicit, reviewed policy.
select is_empty(
  $$ update public.bookmarks set title = 'Edited' where object_id = 'story-a' returning id $$,
  'no UPDATE policy means even the owner cannot update their own bookmark'
);

select * from finish();

rollback;
