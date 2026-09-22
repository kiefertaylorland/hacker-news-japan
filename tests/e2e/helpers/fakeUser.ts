import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "../../integration/helpers/supabaseAdmin";
import FAKE_GITHUB_USER from "../fake-github/user.json" with { type: "json" };

/** The auth.users id GoTrue created for the fake GitHub account, if it has signed in yet. */
async function findFakeUserId(): Promise<string | null> {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`Could not list auth users: ${error.message}`);
  // Annotated: without strictNullChecks, `error` doesn't narrow listUsers' result union.
  const users: User[] = data.users;
  return users.find((user) => user.email === FAKE_GITHUB_USER.email)?.id ?? null;
}

/** Deletes the fake user; `on delete cascade` removes their bookmarks too. */
export async function deleteFakeUser(): Promise<void> {
  const id = await findFakeUserId();
  if (!id) return;
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) throw new Error(`Could not delete the fake user: ${error.message}`);
}

export async function clearFakeUserBookmarks(): Promise<void> {
  const id = await findFakeUserId();
  if (!id) return;
  const { error } = await supabaseAdmin.from("bookmarks").delete().eq("user_id", id);
  if (error) throw new Error(`Could not clear the fake user's bookmarks: ${error.message}`);
}
