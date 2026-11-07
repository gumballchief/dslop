import { analyze, type Shot } from "@/lib/claude";
import { scanSite, normalizeUrl, BlockedError } from "@/lib/scan";
import { allow, oops, publicHost } from "@/lib/guard";

export const maxDuration = 150;

// A screenshot of the top of a page the site already let us read, from Microlink's public API (best effort: it has a
// free daily limit, so the analysis never depends on it). Never used to get past a site that blocks readers.
async function screenshot(url: string): Promise<Shot | null> {
  try {
    const api = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&screenshot.type=jpeg&viewport.width=1440&viewport.height=900`;
    const j = await fetch(api, { signal: AbortSignal.timeout(14_000) }).then((r) => r.json());
    const src = j?.data?.screenshot?.url;
    if (j?.status !== "success" || !src) return null;
    const img = await fetch(src, { signal: AbortSignal.timeout(8_000) });
    const buf = Buffer.from(new Uint8Array(await img.arrayBuffer()));
    return buf.length > 0 && buf.length < 4_500_000 ? { data: buf.toString("base64"), mediaType: "image/jpeg" } : null;
  } catch { return null; }
}

function shotFromDataUrl(d: unknown): Shot | null {
  if (typeof d !== "string") return null;
  const m = /^data:(image\/(jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(d);
  if (!m || m[3].length > 6_000_000) return null;
  return { data: m[3], mediaType: m[1] as Shot["mediaType"] };
}

export async function POST(req: Request) {
  const { url, brief, image } = (await req.json().catch(() => ({}))) as { url?: string; brief?: string; image?: string };
  if (!url && !brief && !image) return oops("Paste a link, upload a screenshot, or describe the site you want");
  if (!allow(req, "analyze", 60)) return oops("That's a lot of sites in an hour. Take a breather and try again soon.", 429);
  try {
    if (image) {
      const shot = shotFromDataUrl(image);
      if (!shot) return oops("That screenshot didn't come through. Try a PNG or JPG under 4 MB.");
      const analysis = await analyze({ shot, fromShot: { url } });
      return Response.json({ scan: null, analysis, from: "screenshot" });
    }
    if (url) {
      const clean = normalizeUrl(url);
      if (!publicHost(clean)) return oops("That address isn't a public website");
      const scan = await scanSite(clean);
      // our own render first; the public screenshot service only when Chrome could not open the page
      const shot: Shot | null = scan.shot ? { data: scan.shot, mediaType: "image/jpeg" } : await screenshot(scan.url);
      const analysis = await analyze({ scan, shot });
      return Response.json({
        scan: { url: scan.url, title: scan.title, builtWith: scan.builtWith, images: scan.images, fonts: scan.fonts, colors: scan.colors, signals: scan.signals, frameable: scan.frameable, rendered: scan.rendered },
        analysis,
        from: `${scan.rendered ? "rendered" : "page"}${shot ? "+screenshot" : ""}`,
        shot: scan.pageShot ?? (shot ? `data:${shot.mediaType};base64,${shot.data}` : null), // the "before" picture, so the browser doesn't have to take another
      });
    }
    const analysis = await analyze({ brief: String(brief).slice(0, 2000) });
    return Response.json({ scan: null, analysis, from: "brief" });
  } catch (e) {
    if (e instanceof BlockedError) {
      return Response.json({ error: "This site blocks automated readers, so DSlop can't open it from here. Upload a screenshot of it instead and DSlop will read that.", code: "blocked" }, { status: 422 });
    }
    const msg = e instanceof Error ? e.message : "Something went wrong";
    if (/look like a web address|Invalid URL/i.test(msg)) return oops("That doesn't look like a web address. Paste a full link like yoursite.com, or describe the site instead.");
    if (/fetch failed|aborted|timeout|answered|ENOTFOUND/i.test(msg)) return oops(`Couldn't open that site (${msg}). Check the link, upload a screenshot, or describe the site instead.`, 502);
    if (/api key|authentication|401/i.test(msg)) return oops("DSlop isn't connected to Claude yet. The owner needs to add the API key.", 500);
    return oops(msg, 500);
  }
}
