import { loadVotes } from "@/lib/votes/actions";

export async function GET(request: Request) {
  const ids = new URL(request.url).searchParams.get("ids")?.split(",") ?? [];
  try {
    return Response.json(await loadVotes(ids), { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Could not load votes" }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
