import { deleteFakeUser } from "./helpers/fakeUser";

export default async function globalTeardown() {
  await deleteFakeUser();
}
