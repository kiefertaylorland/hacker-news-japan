import { assertLocalSupabaseEnv } from "../helpers/assertLocalSupabase";
import { deleteFakeUser } from "./helpers/fakeUser";

export default async function globalSetup() {
  assertLocalSupabaseEnv("E2E tests", "Run them via `npm run test:e2e`, which starts it and exports");
  // A crashed earlier run can leave the user (and its bookmarks) behind.
  await deleteFakeUser();
}
