import { loadVote } from "@/lib/votes/actions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    return Response.json(await loadVote(id), { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Could not load votes" }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
