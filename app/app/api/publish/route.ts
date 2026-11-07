import { saveSite } from "@/lib/store";
import { allow, oops } from "@/lib/guard";

export async function POST(req: Request) {
  const { html, name, id: existing } = (await req.json().catch(() => ({}))) as { html?: string; name?: string; id?: string };
  if (!html || !/<html/i.test(html)) return oops("There's no page to publish yet");
  if (html.length > 1_500_000) return oops("That page is too big to publish");
  if (!allow(req, "publish", 40)) return oops("Too many publishes in an hour. Try again soon.", 429);
  const slug = (name ?? "site").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "site";
  const id = existing && /^[a-z0-9-]{4,40}$/.test(existing) ? existing : `${slug}-${Math.random().toString(36).slice(2, 7)}`;
  try {
    await saveSite(id, html);
    return Response.json({ id, path: `/s/${id}` });
  } catch (e) {
    return oops(e instanceof Error ? e.message : "Publishing failed", 500);
  }
}
