// Serves a published site at /s/<id>.
import { loadSite } from "@/lib/store";

export async function GET(_req: Request, ctx: RouteContext<"/s/[id]">) {
  const { id } = await ctx.params;
  const html = await loadSite(id);
  if (!html) return new Response("This site isn't here (or was never published).", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=60" } });
}
