// The chat next to the six directions: talk, ask questions, or ask for different looks (it can replace some directions).
import { talk, type Analysis } from "@/lib/claude";
import { allow, oops } from "@/lib/guard";

export const maxDuration = 120;

export async function POST(req: Request) {
  const { analysis, message, history } = (await req.json().catch(() => ({}))) as { analysis?: Analysis; message?: string; history?: { who: string; text: string }[] };
  if (!analysis?.directions?.length || !message?.trim()) return oops("Say something first");
  if (!allow(req, "talk", 200)) return oops("That's a lot of messages in an hour. Try again soon.", 429);
  try {
    const out = await talk(analysis, message.slice(0, 1200), Array.isArray(history) ? history.slice(-8) : []);
    return Response.json(out);
  } catch (e) {
    return oops(e instanceof Error ? e.message : "That didn't go through", 500);
  }
}
