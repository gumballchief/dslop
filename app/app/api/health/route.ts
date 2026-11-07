// Health check for the page reader: opens one fixed page (example.com) in the serverless Chrome and reports how it went.
// Takes no input, so it can't be pointed anywhere else.
import { renderPage } from "@/lib/render";

export const maxDuration = 60;

export async function GET() {
  const t = Date.now();
  const r = await renderPage("https://example.com", 40_000);
  return Response.json({ chrome: !!r, ms: Date.now() - t, words: r ? r.text.split(/\s+/).filter(Boolean).length : 0, shotKB: r ? Math.round((r.shot.length * 3) / 4 / 1024) : 0 }, { headers: { "cache-control": "no-store" } });
}
