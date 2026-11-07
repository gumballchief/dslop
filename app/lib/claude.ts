// Everything Unslop asks Claude. The taste library (lib/taste.ts, from TASTE.md) is the cached system prompt for all three calls.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { TASTE } from "./taste";
import type { Scan } from "./scan";

export const MODEL = "claude-opus-5-5";

// The key lives only in the server environment (Vercel env, or the local launcher). Never in the browser.
export const client = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? process.env.UNSLOP_ANTHROPIC_KEY });

const SYSTEM_TASTE: Anthropic.TextBlockParam = { type: "text", text: TASTE, cache_control: { type: "ephemeral" } };

/* ───────── 1. analysis: what the site is, what's slop about it, three directions ───────── */

const Direction = z.object({
  key: z.string().describe("Letter of the art direction in the taste library, A to L"),
  name: z.string().describe("Short memorable name for this direction for THIS site, 1-3 words"),
  why: z.string().describe("One sentence: why this look fits this site"),
  world: z.string().describe("What is behind and around the content: the world, concretely"),
  hero: z.string().describe("The hero composition in one or two sentences"),
  signature: z.string().describe("The one owned thing: color, typeface or device"),
  motion: z.string().describe("The motion language in one sentence"),
  headline: z.string().describe("The new hero headline in this direction's voice, using real facts, max 8 words"),
  subline: z.string().describe("One supporting line, max 18 words"),
  cta: z.string().describe("The one primary button label, a real verb, max 4 words"),
  palette: z.object({ ground: z.string(), surface: z.string(), ink: z.string(), accent: z.string(), accent2: z.string() }).describe("Hex colors"),
  fonts: z.object({ display: z.string(), body: z.string() }).describe("Real Google Fonts family names"),
  dark: z.boolean().describe("True when the ground is dark"),
});

export const Analysis = z.object({
  site: z.object({
    name: z.string(),
    oneLiner: z.string().describe("What the company or person actually does, plainly, max 14 words"),
    kind: z.enum(["ai-devtool", "enterprise-b2b", "fintech", "health-education", "shop-local", "studio-agency", "creator-community", "writing-research", "other"]),
    audience: z.string(),
    facts: z.array(z.string()).describe("Real, specific facts from the site: names, places, prices, numbers, hours, customers. Never invent."),
    sections: z.array(z.object({ heading: z.string(), body: z.string() })).describe("The content the new page must keep, rewritten without filler, in page order"),
  }),
  tells: z.array(z.object({
    label: z.string().describe("Plain words, 2-4 words, e.g. 'Purple gradient'"),
    severity: z.enum(["loud", "quiet"]),
    evidence: z.string().describe("Quote or describe exactly where it is on this site"),
    fix: z.string().describe("The fix in one short sentence"),
  })),
  strengths: z.array(z.string()).describe("What already works on this site, specific and true, 0 to 5 items. Required when the score is under 40."),
  score: z.number().int().min(0).max(100).describe("How AI-made it looks, by the rubric: 0-19 crafted, 20-39 mostly crafted, 40-69 template-ish, 70-100 AI template"),
  verdict: z.string().describe("One honest sentence about the current site, no filler words. If it is not slop, say so plainly."),
  directions: z.array(Direction).length(3).describe("Three directions that look nothing alike, best first"),
});
export type Analysis = z.infer<typeof Analysis>;
export type Direction = z.infer<typeof Direction>;

const HONEST = `Be factual and calibrated. People will paste famous, well-designed sites to test you; a crafted site must get a low score and an honest verdict that says it is not slop.
Score rubric (count only what you can verify):
- 0-19 crafted: its own or a characterful typeface, a specific art direction or world, the real product or real imagery up front, concrete copy. Few or no tells.
- 20-39 mostly crafted: a clear identity with one or two generic habits.
- 40-69 template-ish: several tells (default font, generic sections, filler copy) but some real content.
- 70-100 AI template: purple or pink gradient hero, filler verbs, identical icon cards, eyebrow labels, default buttons, no real product.
Only list a tell if you can quote it from the words, see it in the screenshot, or it is in the code signals AND fits the page. Scanner flags are hints, not proof; drop any you cannot confirm. A screenshot's capture glitches (an image that has not loaded, a cookie banner, a cut-off edge) are not tells. Never invent tells to fill the list; an empty list is a fine answer for a good site. Always list real strengths for sites under 40.
Facts: only what is actually on the site or in the person's words.`;

export type Shot = { data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" };

export async function analyze(input: { scan?: Scan; brief?: string; shot?: Shot | null; fromShot?: { url?: string } }): Promise<Analysis> {
  const body = input.fromShot
    ? `Unslop this site from the attached screenshot, which the person uploaded${input.fromShot.url ? ` (it is ${input.fromShot.url})` : ""}. Read every word you can see, keep every real fact, and judge only what is visible.`
    : input.scan
    ? `Unslop this existing site.\n\nURL: ${input.scan.url}\nBuilt with: ${input.scan.builtWith ?? "unknown"}\nTitle: ${input.scan.title}\nDescription: ${input.scan.description}\nFonts in use: ${input.scan.fonts.join(", ") || "none detected"}\nColors in use: ${input.scan.colors.join(", ") || "none detected"}\nImages on the site: ${input.scan.images.length}\n${input.scan.thin ? "Note: the HTML carried very little text (the page draws itself with JavaScript), so judge from what is here and the screenshot if there is one; do not call the site empty.\n" : ""}${input.shot ? "A screenshot of the top of the page is attached: trust what you see in it over the code signals.\n" : ""}\nTells the scanner flagged from the code (keep the ones that hold up, drop any that are wrong for this site, and add what it cannot see):\n${input.scan.signals.map((s) => `- ${s.label}: ${s.evidence}`).join("\n") || "- none"}\n\nThe page's words, in order:\n${input.scan.outline}`
    : `There is no site yet. The person described what they want:\n\n"${input.brief}"\n\nBuild the content from this description only. Facts: only what they said. Tells: list the slop an AI builder would normally produce for this brief (so they can see what we will avoid), as severity "quiet". Score: 0.`;
  const res = await client().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "low", format: zodOutputFormat(Analysis) },
    system: [SYSTEM_TASTE, { type: "text", text: "You are DSlop's art director. Read the site, name what makes it look AI-made with evidence (if anything does), keep every real fact, and pick the three best art directions from the taste library for THIS site (use section 7 to choose; the three must look nothing alike; for a site that is already crafted, offer three bold alternatives). Fill every palette and font for real; fonts must be real Google Fonts families. Never use em dashes or en dashes anywhere in your output.\n\n" + HONEST }],
    messages: [{ role: "user", content: input.shot ? [{ type: "image", source: { type: "base64", media_type: input.shot.mediaType, data: input.shot.data } }, { type: "text", text: body }] : body }],
  });
  if (res.stop_reason === "refusal") throw new Error("Claude declined to read this site");
  if (!res.parsed_output) throw new Error("The analysis came back incomplete, try again");
  return res.parsed_output;
}

/* ───────── 2. the build: one complete HTML file, streamed ───────── */

const BUILD_RULES = `You are Unslop's designer and front-end engineer. Build the complete new landing page for this site in the chosen direction.

Output: ONE complete HTML file and nothing else. Start with <!doctype html>, end with </html>. No markdown fences, no commentary.

Hard rules:
- Inline all CSS and JS. Fonts from Google Fonts via <link>. The only allowed scripts: https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js and https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js (optional).
- Use the site's real images (URLs given) where they fit, with object-fit and alt text. Never link stock photos or placeholder services. When there is no image for something, build it with CSS, SVG or canvas (a drawn world, shapes, a live product mock that is a real working component, not gray bars).
- Keep every real fact. Never invent customers, testimonials, numbers, awards or logos. No fake reviews. No made-up statistics, not even as an animated counter: a counter may only count to a number that appears in the facts.
- Follow the chosen direction exactly: its world, palette, fonts, signature and motion. The page must pass the checklist in section 8 of the taste library.
- Banned on the page: em dashes and en dashes, eyebrow pill labels over headings, numbered section labels (01, 02, Step 1), purple or pink gradients, glow and neon, glassmorphism, three identical icon cards, the words elevate, supercharge, unleash, seamless, transform, empower, next-gen, cutting-edge, revolutionize, effortless.
- Structure: a hero that shows the real thing or the world, then 5 to 8 sections with different layouts, a strong closing call to action, and a footer. Roughly 8 to 10 screens tall on desktop.
- Motion: one element is always alive (the world or the signature object); sections reveal as they enter (IntersectionObserver or GSAP ScrollTrigger); nothing zooms into photos. Respect prefers-reduced-motion.
- Works at 375px wide with no horizontal scroll. Buttons are real links (#sections or mailto/tel from the facts).
- Write the CSS in a <style> in the head first, then the body, then one <script> at the end. Keep the whole file under 1300 lines.`;

// fast = Opus 5.5 fast mode (same model, up to ~2.5x the output speed, premium price). The route falls back to
// standard speed when fast mode is rate limited or unavailable.
export function buildStream(analysis: Analysis, direction: Direction, images: string[], fast = true) {
  const brief = { site: analysis.site, direction, images };
  return client().beta.messages.stream({
    model: MODEL,
    max_tokens: 64000,
    betas: fast ? ["server-side-fallback-2026-07-01", "fast-mode-2026-02-01"] : ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    ...(fast ? { speed: "fast" as const } : {}),
    thinking: { type: "adaptive", display: "summarized" },
    output_config: { effort: "low" },
    system: [SYSTEM_TASTE, { type: "text", text: BUILD_RULES }],
    messages: [{ role: "user", content: `Build it.\n\n${JSON.stringify(brief, null, 2)}` }],
  });
}

/* ───────── 3. chat edits: small find/replace patches that refuse slop ───────── */

const Edits = z.object({
  reply: z.string().describe("One or two plain sentences to the person about what changed (or why a slop request was redirected)"),
  edits: z.array(z.object({ find: z.string().describe("An exact substring of the current file, long enough to be unique"), replace: z.string() })),
});
export type Edits = z.infer<typeof Edits>;

export async function editPage(html: string, ask: string, direction: Direction | null): Promise<Edits> {
  const res = await client().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "low", format: zodOutputFormat(Edits) },
    system: [SYSTEM_TASTE, { type: "text", text: `You edit an existing landing page on request. Return exact find/replace edits against the current file (each find must appear in it exactly once). Keep the page's direction${direction ? ` (${direction.name}: ${direction.world})` : ""} unless asked to change it. If the request would add slop from the taste library (a purple gradient, glow, filler words, em dashes, eyebrow labels, three same cards), do the closest non-slop version and say so in the reply. Never use em dashes.` }],
    messages: [{ role: "user", content: `Current file:\n\n${html}\n\nRequest: ${ask}` }],
  });
  if (!res.parsed_output) throw new Error("The edit came back incomplete, try again");
  return res.parsed_output;
}
