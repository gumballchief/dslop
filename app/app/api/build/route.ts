// Streams the full new page as it is written (see lib/stream.ts for the format).
// When the person shaped a first screen first, the build keeps it and the changes they asked for.
import { buildStream, type Analysis, type Direction } from "@/lib/claude";
import { allow, oops } from "@/lib/guard";
import { ndjsonPage } from "@/lib/stream";

export const maxDuration = 300;

export async function POST(req: Request) {
  const { analysis, direction, images, mock, asks } = (await req.json().catch(() => ({}))) as { analysis?: Analysis; direction?: Direction; images?: string[]; mock?: string; asks?: string[] };
  if (!analysis || !direction) return oops("Pick a direction first");
  if (!allow(req, "build", 40)) return oops("That's a lot of builds in an hour. Try again soon.", 429);
  const from = typeof mock === "string" && mock.length > 200 && mock.length < 80_000
    ? { mock, asks: Array.isArray(asks) ? asks.slice(-12).map((a) => String(a).slice(0, 400)) : [] }
    : undefined;
  return ndjsonPage((fast) => buildStream(analysis, direction, (images ?? []).slice(0, 16), fast, from), "page");
}
