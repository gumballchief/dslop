// Step two of reading a site: look at the best-designed sites in its market (their homepages, live, in Chrome), then
// pick six directions: three in their genre (never copies) and three bold alternatives.
import { directionsFor, type AnalysisCore } from "@/lib/claude";
import { allow, oops, publicHost } from "@/lib/guard";
import { shootMany } from "@/lib/render";

// the library looks the alternatives are drawn from; each run gets a random handful so no two runs look the same
const LIBRARY = [
  "Living world photo (taste library A)", "Painted world plus the product (B)", "Black, quiet, one moving object (C)", "Flat color with loud type (D)",
  "Stripes and stickers (E)", "Editorial serif (F)", "A walk-through metaphor (G)", "One ink (H)", "The product as an object (I)",
  "A computer inside the page (J)", "Poster type (K)", "Line-art world (L)",
  "21st.dev ink sculpture", "21st.dev ASCII wake", "21st.dev product rides the scroll", "21st.dev cobalt engraving", "21st.dev origin descent",
  "21st.dev device opens on scroll", "21st.dev arrow field", "21st.dev soft meadow", "21st.dev glyph portrait", "21st.dev fanned cards",
  "21st.dev inversion circle", "21st.dev marquee and seal", "21st.dev midnight guilloche", "21st.dev photo ring", "21st.dev silk shader", "21st.dev starburst wordmark",
];
const shuffle = <T,>(a: T[]) => a.map((v) => [Math.random(), v] as const).sort((x, y) => x[0] - y[0]).map(([, v]) => v);

export const maxDuration = 150;

export async function POST(req: Request) {
  const { analysis } = (await req.json().catch(() => ({}))) as { analysis?: AnalysisCore };
  if (!analysis?.site || !analysis.market) return oops("Read a site first");
  if (!allow(req, "directions", 80)) return oops("That's a lot of sites in an hour. Try again soon.", 429);
  // a different three of the market's leaders each run (open four, keep the three that opened, best first)
  const candidates = shuffle(analysis.market.leaders
    .filter((l) => { try { const u = new URL(l.url); return u.protocol === "https:" && publicHost(u.toString()); } catch { return false; } }))
    .slice(0, 4);
  try {
    const shots = await shootMany(candidates.map((l) => l.url));
    const all = candidates.map((l, i) => ({ name: l.name, url: l.url, why: l.why, shot: shots[i] }));
    const seen = [...all.filter((l) => l.shot), ...all.filter((l) => !l.shot)].slice(0, 3);
    const set = await directionsFor(analysis, seen, shuffle(LIBRARY).slice(0, 6));
    return Response.json({
      ...set,
      leaders: seen.map((l) => ({ name: l.name, url: l.url, why: l.why, thumb: l.shot ? `data:image/jpeg;base64,${l.shot}` : null })),
    });
  } catch (e) {
    return oops(e instanceof Error ? e.message : "Couldn't pick directions", 500);
  }
}
