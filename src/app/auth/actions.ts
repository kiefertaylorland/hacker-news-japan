"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AUTH_ERROR_PATH } from "@/lib/auth/constants";
import { getRequestOrigin, sanitizeNextPath } from "@/lib/auth/origin";

export async function signInWithGitHub(formData?: FormData) {
  const next = sanitizeNextPath(formData?.get("next")?.toString());
  const origin = await getRequestOrigin();
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    redirect(AUTH_ERROR_PATH);
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
