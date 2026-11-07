// Step two of reading a site: look at the best-designed sites in its market (their homepages, live, in Chrome), then
// pick six directions: three in their genre (never copies) and three bold alternatives.
import { directionsFor, type AnalysisCore } from "@/lib/claude";
import { allow, oops, publicHost } from "@/lib/guard";
import { shootMany } from "@/lib/render";

export const maxDuration = 150;

export async function POST(req: Request) {
  const { analysis } = (await req.json().catch(() => ({}))) as { analysis?: AnalysisCore };
  if (!analysis?.site || !analysis.market) return oops("Read a site first");
  if (!allow(req, "directions", 80)) return oops("That's a lot of sites in an hour. Try again soon.", 429);
  const leaders = analysis.market.leaders
    .filter((l) => { try { const u = new URL(l.url); return u.protocol === "https:" && publicHost(u.toString()); } catch { return false; } })
    .slice(0, 3);
  try {
    const shots = await shootMany(leaders.map((l) => l.url));
    const seen = leaders.map((l, i) => ({ name: l.name, url: l.url, why: l.why, shot: shots[i] }));
    const set = await directionsFor(analysis, seen);
    return Response.json({
      ...set,
      leaders: seen.map((l) => ({ name: l.name, url: l.url, why: l.why, thumb: l.shot ? `data:image/jpeg;base64,${l.shot}` : null })),
    });
  } catch (e) {
    return oops(e instanceof Error ? e.message : "Couldn't pick directions", 500);
  }
}
