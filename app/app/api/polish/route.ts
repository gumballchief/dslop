// The polish pass after a build: Chrome checks the finished page at desktop and phone sizes, Claude fixes what it found.
import { polishPage } from "@/lib/claude";
import { allow, oops } from "@/lib/guard";
import { checkLayout } from "@/lib/qa";

export const maxDuration = 150;

export async function POST(req: Request) {
  const { html } = (await req.json().catch(() => ({}))) as { html?: string };
  if (!html || html.length < 200 || html.length > 400_000) return oops("Nothing to polish");
  if (!allow(req, "polish", 60)) return oops("That's a lot of polishing in an hour. Try again soon.", 429);
  const issues = await checkLayout(html, new URL(req.url).origin);
  if (!issues.length) return Response.json({ html, issues: [], fixed: 0, reply: "" });
  try {
    const out = await polishPage(html, issues);
    let next = html, fixed = 0;
    for (const e of out.edits) {
      const at = next.indexOf(e.find);
      if (at === -1 || !e.find) continue;
      next = next.slice(0, at) + e.replace + next.slice(at + e.find.length);
      fixed++;
    }
    return Response.json({ html: next, issues, fixed, reply: out.reply });
  } catch (e) {
    console.error(`[polish] ${e instanceof Error ? e.message : e}`);
    return Response.json({ html, issues, fixed: 0, reply: "" });
  }
}
