// Streams one direction's first screen (nav + hero), so the three choices are real pages to look at.
import { mockStream, type Analysis, type Direction } from "@/lib/claude";
import { allow, oops } from "@/lib/guard";
import { ndjsonPage } from "@/lib/stream";

export const maxDuration = 120;

export async function POST(req: Request) {
  const { analysis, direction, images, ref } = (await req.json().catch(() => ({}))) as { analysis?: Analysis; direction?: Direction; images?: string[]; ref?: { name?: string; shot?: string } };
  if (!analysis || !direction) return oops("Read a site first");
  if (!allow(req, "mock", 200)) return oops("That's a lot of previews in an hour. Try again soon.", 429);
  // a market direction is drawn with its leader's homepage in view (a small JPEG data URL from /api/directions)
  const m = typeof ref?.shot === "string" ? /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(ref.shot) : null;
  const reference = m && m[1].length < 600_000 ? { name: String(ref?.name ?? "the leader").slice(0, 60), shot: m[1] } : null;
  return ndjsonPage((fast) => mockStream(analysis, direction, (images ?? []).slice(0, 16), fast, reference), "preview");
}
