// Streams one direction's first screen (nav + hero), so the three choices are real pages to look at.
import { mockStream, type Analysis, type Direction } from "@/lib/claude";
import { allow, oops } from "@/lib/guard";
import { ndjsonPage } from "@/lib/stream";

export const maxDuration = 120;

export async function POST(req: Request) {
  const { analysis, direction, images } = (await req.json().catch(() => ({}))) as { analysis?: Analysis; direction?: Direction; images?: string[] };
  if (!analysis || !direction) return oops("Read a site first");
  if (!allow(req, "mock", 200)) return oops("That's a lot of previews in an hour. Try again soon.", 429);
  return ndjsonPage((fast) => mockStream(analysis, direction, (images ?? []).slice(0, 16), fast), "preview");
}
