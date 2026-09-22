begin;

select plan(7);

-- Exactly these three policies should exist (implicitly proves there is no
-- UPDATE policy: bookmarks are insert/delete only, never edited in place).
select policies_are(
  'public',
  'bookmarks',
  ARRAY['bookmarks_select_own', 'bookmarks_insert_own', 'bookmarks_delete_own'],
  'bookmarks should have exactly the three expected policies'
);

select policy_cmd_is('public', 'bookmarks', 'bookmarks_select_own', 'select', 'bookmarks_select_own should apply to SELECT');
select policy_cmd_is('public', 'bookmarks', 'bookmarks_insert_own', 'insert', 'bookmarks_insert_own should apply to INSERT');
select policy_cmd_is('public', 'bookmarks', 'bookmarks_delete_own', 'delete', 'bookmarks_delete_own should apply to DELETE');

select policy_roles_are('public', 'bookmarks', 'bookmarks_select_own', ARRAY['authenticated']);
select policy_roles_are('public', 'bookmarks', 'bookmarks_insert_own', ARRAY['authenticated']);
select policy_roles_are('public', 'bookmarks', 'bookmarks_delete_own', ARRAY['authenticated']);

select * from finish();

rollback;
