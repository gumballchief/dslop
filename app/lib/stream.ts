// Streams a page as Claude writes it, as newline-separated JSON:
//   {"t":"think","d":"..."}  the designer's notes (thinking summary)
//   {"t":"html","d":"..."}   the next piece of the HTML file
//   {"t":"done"} | {"t":"error","m":"..."}
// Tries fast mode first and starts over at standard speed if fast mode is busy before anything was written.
import Anthropic from "@anthropic-ai/sdk";
import type { PageStream } from "./claude";

export function ndjsonPage(make: (fast: boolean) => PageStream, what = "page"): Response {
  const enc = new TextEncoder();
  const body = new ReadableStream({
    async start(ctrl) {
      const send = (o: object) => ctrl.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      try {
        let wrote = false;
        const run = async (fast: boolean) => {
          const stream = make(fast);
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
          if (wrote || !(e instanceof Anthropic.RateLimitError || e instanceof Anthropic.BadRequestError || e instanceof Anthropic.PermissionDeniedError)) throw e;
          send({ t: "think", d: "\n(Fast lane is busy, going at normal speed.)\n" });
          final = await run(false);
        }
        if (final.stop_reason === "refusal") send({ t: "error", m: `Claude declined to draw this ${what}.` });
        else if (final.stop_reason === "max_tokens") send({ t: "error", m: `The ${what} ran long and got cut off. Try again.` });
        else send({ t: "done" });
      } catch (e) {
        send({ t: "error", m: e instanceof Error ? e.message : `The ${what} failed` });
      } finally {
        ctrl.close();
      }
    },
  });
  return new Response(body, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
