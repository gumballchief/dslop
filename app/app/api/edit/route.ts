import { editPage, type Direction } from "@/lib/claude";
import { allow, oops } from "@/lib/guard";

export const maxDuration = 120;

export async function POST(req: Request) {
  const { html, ask, direction } = (await req.json().catch(() => ({}))) as { html?: string; ask?: string; direction?: Direction | null };
  if (!html || !ask?.trim()) return oops("Say what to change");
  if (!allow(req, "edit", 200)) return oops("That's a lot of edits in an hour. Try again soon.", 429);
  try {
    const out = await editPage(html, ask.slice(0, 1200), direction ?? null);
    let next = html, applied = 0;
    const missed: string[] = [];
    for (const e of out.edits) {
      const at = next.indexOf(e.find);
      if (at === -1 || !e.find) { missed.push(e.find.slice(0, 60)); continue; }
      next = next.slice(0, at) + e.replace + next.slice(at + e.find.length);
      applied++;
    }
    return Response.json({ html: next, reply: out.reply, applied, missed: missed.length });
  } catch (e) {
    return oops(e instanceof Error ? e.message : "The edit failed", 500);
  }
}
