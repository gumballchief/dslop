// Streams the new page as it is written, as newline-separated JSON:
//   {"t":"think","d":"..."}  the designer's notes (thinking summary)
//   {"t":"html","d":"..."}   the next piece of the HTML file
//   {"t":"done"} | {"t":"error","m":"..."}
import Anthropic from "@anthropic-ai/sdk";
import { buildStream, type Analysis, type Direction } from "@/lib/claude";
import { allow, oops } from "@/lib/guard";

export const maxDuration = 300;

export async function POST(req: Request) {
  const { analysis, direction, images } = (await req.json().catch(() => ({}))) as { analysis?: Analysis; direction?: Direction; images?: string[] };
  if (!analysis || !direction) return oops("Pick a direction first");
  if (!allow(req, "build", 12)) return oops("That's a lot of builds in an hour. Try again soon.", 429);

  const enc = new TextEncoder();
  const body = new ReadableStream({
    async start(ctrl) {
      const send = (o: object) => ctrl.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      try {
        let wrote = false;
        const run = async (fast: boolean) => {
          const stream = buildStream(analysis, direction, (images ?? []).slice(0, 16), fast);
          for await (const ev of stream) {
            if (ev.type === "content_block_delta") {
              if (ev.delta.type === "thinking_delta") send({ t: "think", d: ev.delta.thinking });
              else if (ev.delta.type === "text_delta") { wrote = true; send({ t: "html", d: ev.delta.text }); }
            }
          }
          return stream.finalMessage();
        };
        let final;
        try {
          final = await run(true);
        } catch (e) {
          // fast mode busy or not on this account: start over at standard speed, if nothing was written yet
          if (wrote || !(e instanceof Anthropic.RateLimitError || e instanceof Anthropic.BadRequestError || e instanceof Anthropic.PermissionDeniedError)) throw e;
          send({ t: "think", d: "\n(Fast lane is busy, building at normal speed.)\n" });
          final = await run(false);
        }
        if (final.stop_reason === "refusal") send({ t: "error", m: "Claude declined to build this one." });
        else if (final.stop_reason === "max_tokens") send({ t: "error", m: "The page ran long and got cut off. Try again." });
        else send({ t: "done" });
      } catch (e) {
        send({ t: "error", m: e instanceof Error ? e.message : "The build failed" });
      } finally {
        ctrl.close();
      }
    },
  });
  return new Response(body, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
