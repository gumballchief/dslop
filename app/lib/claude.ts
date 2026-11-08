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

/* ───────── 1. analysis: what the site is, what's slop about it, its market ───────── */

const Direction = z.object({
  key: z.string().describe("Letter of the taste library direction (A to L), the 21st.dev genre name, or \"market\""),
  group: z.enum(["market", "library"]).describe("market: DSlop's own version of one market leader's site; library: a bold alternative"),
  ref: z.string().describe("For market: the leader this is DSlop's version of, its name exactly as given. For library: an empty string"),
  keep: z.string().describe("For market: what stays from that leader's general site look, concretely (page structure, kind of hero, the component vocabulary like answer tiles, mascot scene, leaderboard, app screen, the density and the level of polish). For library: an empty string"),
  change: z.string().describe("For market: what is DSlop's own, concretely (moved placements, each component swapped for a close cousin, a different palette, different type). For library: an empty string"),
  nod: z.string().describe("One short line for the card: for market, which leader it is a take on and what makes it its own (e.g. \"A Duolingo-style playful hero, with a drawn quiz card instead of a mascot, in coral and navy\"); for library, the look in plain words and where it comes from (e.g. \"A desktop of real windows, from the taste library\" or \"The ASCII-wake genre from 21st.dev\"), never a bare letter"),
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

const Market = z.object({
  name: z.string().describe("The market in a few plain words, e.g. 'developer infrastructure', 'specialty coffee roasters', 'neighborhood bike shops'"),
  leaders: z.array(z.object({
    name: z.string(),
    url: z.string().describe("The real homepage, a full https URL"),
    why: z.string().describe("What its design does well, one short sentence"),
  })).min(3).max(6).describe("Four to six of the best-designed real, well-known sites in this market (not this site itself), best first"),
});

export const AnalysisCore = z.object({
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
  market: Market,
});
export type AnalysisCore = z.infer<typeof AnalysisCore>;
// the directions arrive in a second step (directionsFor), after the market leaders have been looked at
export type Analysis = AnalysisCore & { directions: Direction[]; conventions?: string };
export type Direction = z.infer<typeof Direction>;

const HONEST = `Be factual and calibrated. People will paste famous, well-designed sites to test you; a crafted site must get a low score and an honest verdict that says it is not slop.
Score rubric (count only what you can verify):
- 0-19 crafted: its own or a characterful typeface, a specific art direction or world, the real product or real imagery up front, concrete copy. Few or no tells.
- 20-39 mostly crafted: a clear identity with one or two generic habits.
- 40-69 template-ish: several tells (default font, generic sections, filler copy) but some real content.
- 70-100 AI template: purple or pink gradient hero, filler verbs, identical icon cards, eyebrow labels, default buttons, no real product.
The common AI-builder look (Lovable, Bolt, v0 and their clones): a dark navy or near-black ground with violet or blue glow, or a white page with violet accents; gradient text inside the headline; a small pill badge above the headline; a centered hero with two buttons; rows of rounded cards with small icons; Inter or another default sans everywhere. A page with three or more of these is an AI template (70 or more) even when its copy is decent and it has a real product. An app screen (a tool, a dashboard, a game) is judged on its own design, not as a landing page.
Only list a tell if you can quote it from the words, see it in the screenshot, or it is in the code signals AND fits the page. Scanner flags are hints, not proof; drop any you cannot confirm. A screenshot's capture glitches (an image that has not loaded, a cookie banner, a cut-off edge) are not tells. Never invent tells to fill the list; an empty list is a fine answer for a good site. Always list real strengths for sites under 40.
Facts: only what is actually on the site or in the person's words.
Quotes: when you quote the site, copy its words exactly, inside double quotes, with its own punctuation (a dash inside a quote is fine: the no-dash rule is for your own words). Do not shorten a quote with ellipses; quote a shorter exact piece instead.`;

export type Shot = { data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" };

export async function analyze(input: { scan?: Scan; brief?: string; shot?: Shot | null; fromShot?: { url?: string } }): Promise<Analysis> {
  const body = input.fromShot
    ? `Unslop this site from the attached screenshot, which the person uploaded${input.fromShot.url ? ` (it is ${input.fromShot.url})` : ""}. Read every word you can see, keep every real fact, and judge only what is visible.`
    : input.scan
    ? `Unslop this existing site.\n\nURL: ${input.scan.url}\nBuilt with: ${input.scan.builtWith ?? "unknown"}\nTitle: ${input.scan.title}\nDescription: ${input.scan.description}\nFonts in use: ${input.scan.fonts.join(", ") || "none detected"}\nColors in use: ${input.scan.colors.join(", ") || "none detected"}\nImages on the site: ${input.scan.images.length}\n${input.scan.rendered ? "The page was opened in a real browser: the words below are what a person sees after JavaScript runs, and the signals with quoted text or computed styles were measured on the live page, so they are proof.\n" : ""}${input.scan.thin && !input.scan.rendered ? "Note: the HTML carried very little text (the page draws itself with JavaScript), so judge from what is here and the screenshot if there is one; do not call the site empty.\n" : ""}${input.shot ? "A screenshot of the top of the page is attached: trust what you see in it over the code signals.\n" : ""}\nTells the scanner flagged from the code (keep the ones that hold up, drop any that are wrong for this site, and add what it cannot see):\n${input.scan.signals.map((s) => `- ${s.label}: ${s.evidence}`).join("\n") || "- none"}\n\nThe page's words, in order:\n${input.scan.outline}`
    : `There is no site yet. The person described what they want:\n\n"${input.brief}"\n\nBuild the content from this description only. Facts: only what they said. Tells: list the slop an AI builder would normally produce for this brief (so they can see what we will avoid), as severity "quiet". Score: 0.`;
  const res = await client().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "low", format: zodOutputFormat(AnalysisCore) },
    system: [SYSTEM_TASTE, { type: "text", text: "You are DSlop's art director. Read the site, name what makes it look AI-made with evidence (if anything does), keep every real fact, and name its market with the three best-designed real sites in that market (well-known homepages with full https URLs, not this site itself), so their look can be studied next. Never use em dashes or en dashes anywhere in your output.\n\n" + HONEST }],
    messages: [{ role: "user", content: input.shot ? [{ type: "image", source: { type: "base64", media_type: input.shot.mediaType, data: input.shot.data } }, { type: "text", text: body }] : body }],
  });
  if (res.stop_reason === "refusal") throw new Error("Claude declined to read this site");
  if (!res.parsed_output) throw new Error("The analysis came back incomplete, try again");
  return { ...undashAll(res.parsed_output), directions: [] };
}

/* ───────── 1b. six directions, after looking at the market leaders ───────── */

const DirectionSet = z.object({
  conventions: z.string().describe("What the leaders' sites have in common visually, one or two plain sentences"),
  directions: z.array(Direction).length(6).describe("Six directions that look nothing alike: the three market ones first, then the three library ones"),
});

const DIRECTION_RULES = `You are DSlop's art director, choosing six directions for this site's new landing page.
Directions 1 to 3 have group "market": each is DSlop's take on ONE leader's homepage (a different leader each; set "ref" to its name exactly), and it must be recognizable as that leader's kind of page at a glance. KEEP, nearly as is: its composition (the layout grid, where the headline, buttons and main visual sit and how big each is), its type style (serif or grotesk, weight, size, tracking, case), its kind of main visual (one 3D object on white, a painted sky above a product window, a light streak on black, colorful game tiles), its nav style, its spacing, density and motion feel, and its lightness (a near-black leader stays dark, a white one stays light). CHANGE: the hue family of the palette (never the leader's brand colors), the words (this site's), and what the main visual shows (this site's product or world); swap at most one component for a close cousin. Write "keep" and "change" concretely, naming positions and sizes. Never the leader's logo, name, mascot, illustrations, photos or copy. If a leader is itself slop, take only its structure.
Directions 4 to 6 have group "library": bold alternatives from the taste library directions (section 3, keys A to L) and the 21st.dev genres (section 7d) that still suit this site. In "nod" describe the look in plain words and name where it comes from, never a bare library letter.
All six must look nothing alike (section 7). Fill every palette and font for real; fonts must be real Google Fonts families. Headlines and sublines use the site's real facts. Never use em dashes or en dashes.`;

// pool = the library looks to choose the three alternatives from this run (a fresh random mix each time, for variety)
export async function directionsFor(analysis: AnalysisCore, leaders: { name: string; url: string; shot: string | null }[], pool: string[] = []): Promise<{ conventions: string; directions: Direction[] }> {
  const seen = leaders.filter((l) => l.shot);
  const content: Anthropic.ContentBlockParam[] = [];
  for (const l of seen) {
    content.push({ type: "text", text: `${l.name} (${l.url}), the top of its homepage right now:` });
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: l.shot! } });
  }
  const unseen = leaders.filter((l) => !l.shot).map((l) => l.name);
  content.push({ type: "text", text: `The site:\n${JSON.stringify({ site: analysis.site, market: analysis.market.name, verdict: analysis.verdict, tells: analysis.tells.map((t) => t.label) }, null, 2)}\n\n${seen.length ? `Above are the homepages of the best-designed sites in its market (${seen.map((l) => l.name).join(", ")}).` : ""}${unseen.length ? ` These leaders could not be opened right now, use what you know of their look: ${unseen.join(", ")}.` : ""}${pool.length ? `\n\nThis time, take the three library looks from these (pick the ones that suit the site best): ${pool.join("; ")}.` : ""}\n\nPick the six directions: the three market ones are takes on ${leaders.map((l) => l.name).join(", ")}.` });
  const res = await client().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "low", format: zodOutputFormat(DirectionSet) },
    system: [SYSTEM_TASTE, { type: "text", text: DIRECTION_RULES }],
    messages: [{ role: "user", content }],
  });
  if (!res.parsed_output) throw new Error("The directions came back incomplete, try again");
  return undashAll(res.parsed_output);
}

/* ───────── 1c. talking with DSlop while you pick ───────── */

const Talk = z.object({
  reply: z.string().describe("One or two short, warm, plain sentences to the person"),
  changes: z.array(z.object({ index: z.number().int().min(0).max(5), direction: Direction })).describe("Directions to replace, by position (0 is the first card). Empty when they are just talking."),
});
export type Talk = z.infer<typeof Talk>;

export async function talk(analysis: Analysis, message: string, history: { who: string; text: string }[]): Promise<Talk> {
  const cards = analysis.directions.map((d, i) => ({ position: i, name: d.name, group: d.group, nod: d.nod, headline: d.headline, world: d.world, palette: d.palette, fonts: d.fonts, dark: d.dark }));
  const res = await client().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "low", format: zodOutputFormat(Talk) },
    system: [SYSTEM_TASTE, { type: "text", text: `You are DSlop, a design studio in a chat box, talking with the person while they look at six real first screens drawn for their site (the cards below, by position). Reply in one or two short plain sentences, friendly, like a good designer. If they ask for a change to the looks (darker, warmer, more playful, more like a brand or their market, a different font, color or component), put complete replacement directions in "changes": only the ones that should change (all six if they ask for all; for "one more like X" replace the one that fits their ask worst), following the same rules as before (real Google Fonts, real facts, the six still look nothing alike, no slop, keep each card's group unless they ask otherwise). If they name a brand, take its genre, never its identity. If they ask for slop (a purple gradient, glow, filler words), give the closest non-slop version and say so. If they just say hi or ask something, answer and return no changes. Never use em dashes or en dashes.` }],
    messages: [{ role: "user", content: `The site: ${JSON.stringify(analysis.site)}\nMarket: ${analysis.market.name}\n\nThe six cards now:\n${JSON.stringify(cards, null, 1)}\n\nThe chat so far:\n${history.slice(-8).map((h) => `${h.who}: ${h.text}`).join("\n") || "(nothing yet)"}\n\nThe person says: ${message}` }],
  });
  if (!res.parsed_output) throw new Error("That didn't come back right, try again");
  return undashAll(res.parsed_output);
}

// DSlop's own words never use em or en dashes. Text inside quotes is the site's own and stays exact (it is the proof).
function undash(s: string): string {
  return s.split(/("[^"]*"|\u201c[^\u201d]*\u201d)/).map((part, i) => (i % 2 ? part : part.replace(/(\d)\s*[\u2013\u2014]\s*(\d)/g, "$1 to $2").replace(/\s*[\u2013\u2014]\s*/g, ", "))).join("");
}
function undashAll<T>(v: T): T {
  if (typeof v === "string") return undash(v) as T;
  if (Array.isArray(v)) return v.map(undashAll) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, undashAll(x)])) as T;
  return v;
}

/* ───────── 2. the build: one complete HTML file, streamed ───────── */

const FX_DOCS = `DSlop's motion engine (the 21st.dev-grade effects, already built and tested). Load it once, last thing in the body: <script src="/fx.js" defer></script>. Turn effects on with attributes; several on one element are space separated (data-fx="dots grain"). Content stays visible without it and nothing moves for reduced motion, so never hide content yourself.
Backgrounds (put on a section; color with data-fx-color, in the palette):
- data-fx="spotlight": a soft light that follows the cursor across the section and drifts on its own when idle (data-fx-size px, data-fx-strength 0 to 1). This is a light, not a neon glow.
- data-fx="dots": a dot grid that ripples and bends toward the cursor (data-fx-gap px).
- data-fx="lines": silky wave lines that part around the cursor (data-fx-count).
- data-fx="sonar": rings that ping and expand, and on click.
- data-fx="grain": a film-grain texture over the section.
Text:
- data-fx="split" on a headline: words rise in one by one (on load; add data-fx-on="view" for headings further down).
- data-fx="scramble" on a short label or code: letters scramble, then settle.
- data-fx="count" data-to="1250" (data-prefix, data-suffix, data-decimals): counts up when seen. ONLY a number that is in the facts.
- data-reveal="up|left|right|blur|clip|scale" on any element: it enters as it scrolls into view. data-reveal-stagger="up" on a parent staggers its children.
Pointer:
- data-fx="magnetic" on the primary button: it pulls toward the cursor.
- data-fx="tilt" on a card or product shot: 3D tilt with a light sheen (data-fx-max degrees).
- data-fx="cardlight" on a grid of cards: a light follows the cursor across the cards.
- data-fx="cursor" on body: a small custom cursor that grows over links.
Scroll set pieces:
- data-fx="sticky-story": a two-column block; left = text steps <div data-step="a">..., right = <div class="fx-media"> holding <div data-media="a">... panels that swap as each step reaches the middle.
- data-fx="horizontal": a section holding <div class="fx-sticky"><div class="fx-track">cards</div></div>; scrolling down slides the track sideways.
- data-fx="device" on a product frame: it tilts up from flat into place as it scrolls in.
- data-fx="velocity" (data-fx-dir="left|right") on a huge one-line type band: it slides sideways with the scroll.
- data-fx="parallax" data-speed="0.3" on a layer: depth as you scroll.
- data-fx="draw" on an inline SVG: its strokes draw themselves when seen.
- data-fx="marquee" (data-fx-speed seconds, data-fx-dir) on a row of items: an endless band that pauses on hover.
- data-fx="progress" on body (data-fx-color): a thin scroll progress line at the top.`;

const BUILD_RULES = `You are Unslop's designer and front-end engineer. Build the complete new landing page for this site in the chosen direction.

Output: ONE complete HTML file and nothing else. Start with <!doctype html>, end with </html>. No markdown fences, no commentary.

Hard rules:
- Inline all CSS. Fonts from Google Fonts via <link>. Scripts: /fx.js (the motion engine below, required), plus optionally https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js and ScrollTrigger.min.js and one small inline <script> for a custom canvas or interaction.
- Use the site's real images (URLs given) where they fit, with object-fit and alt text. Never link stock photos or placeholder services. When there is no image for something, build it with CSS, SVG or canvas (a drawn world, shapes, a live product mock that is a real working component, not gray bars).
- Keep every real fact. Never invent customers, testimonials, numbers, awards or logos. No fake reviews. No made-up statistics, not even as an animated counter: a counter may only count to a number that appears in the facts.
- Follow the chosen direction exactly: its world, palette, fonts, signature and motion. The page must pass the checklist in section 8 of the taste library.
- Banned on the page: em dashes and en dashes, eyebrow pill labels over headings, numbered section labels (01, 02, Step 1), purple or pink gradients, glow and neon, glassmorphism, three identical icon cards, the words elevate, supercharge, unleash, seamless, transform, empower, next-gen, cutting-edge, revolutionize, effortless.
- Structure: a hero that shows the real thing or the world, then 5 to 8 sections with different layouts, a strong closing call to action, and a footer. Roughly 8 to 10 screens tall on desktop.
- Motion is not optional, and it must feel expensive, like the best 21st.dev pages: use the motion engine generously. At least: a background effect on the hero (spotlight, dots, lines or sonar, often with grain), split on the hero headline, magnetic on the main button, data-reveal or data-reveal-stagger on every section, tilt or cardlight on cards, and at least two scroll set pieces from sticky-story, horizontal, device, velocity, draw, parallax and marquee, chosen to fit the direction. Never zoom into photos. Everything is readable with motion off.
- Works at 375px wide with no horizontal scroll. Buttons are real links (#sections or mailto/tel from the facts).
- Never put a screenshot of the old site in the new page. An image with words baked into it is never cropped, rotated or shrunk until its words are cut off or unreadable.
- Device frames (phones, laptops, browser windows): build what is on the screen in HTML and CSS, sized to fit the frame, with text you can read; never fill a device with an image of a page.
- Nothing ever covers text: decorative objects, devices and cards sit beside the headline or behind it only where every word stays fully readable.
- No text is ever clipped or cut off by its box. Tables and number lists: a header row, aligned columns, numbers right-aligned, no wrapping inside cells, and the table fits its box (on phones it scrolls sideways inside its own box).
- Write the CSS in a <style> in the head first, then the body, then the scripts at the end (fx.js last). Keep the whole file under 1300 lines.`;

const MOCK_RULES = `You are DSlop's designer. Draw the FIRST SCREEN of this site's new landing page in the chosen direction, so the person can see the real look before the full page is built: the nav and the complete hero at 1440 by 900, with the top of the next section just peeking in at the bottom edge.

Output: ONE complete HTML file and nothing else. Start with <!doctype html>, end with </html>. No markdown fences, no commentary. Under 200 lines.

Hard rules:
- Inline all CSS. Fonts from Google Fonts via <link>. The only script: <script src="/fx.js" defer></script> at the end of the body (the motion engine below).
- It must already feel alive: a background effect on the hero (spotlight, dots, lines or sonar, with grain if it suits), split on the headline, magnetic on the main button, tilt on the product shot or card. No data-reveal in a preview: everything is visible within a second.
- Use the site's real images (URLs given) where they fit, with object-fit and alt text. Never stock photos or placeholder services. When there is no image, build the world with CSS or inline SVG: drawn and specific to this site, never gray boxes.
- Keep real facts only. Never invent numbers, customers, reviews or awards.
- Follow the direction exactly: its world, palette, fonts, signature, headline, subline and CTA. This screen must already be unmistakably this direction and nothing like the other two.
- Banned: em dashes and en dashes, eyebrow pill labels over headings, numbered labels, purple or pink gradients, glow and neon, glassmorphism, and the words elevate, supercharge, unleash, seamless, transform, empower, next-gen, cutting-edge, revolutionize, effortless.
- The hero fills 100vh with a min-height of 760px. It must also hold up at 375px wide.
- Never put a screenshot of the old site in the new page. An image with words baked into it is never cropped, rotated or shrunk until its words are cut off or unreadable.
- Device frames (phones, laptops, browser windows): build what is on the screen in HTML and CSS, sized to fit the frame, with text you can read; never fill a device with an image of a page.
- Nothing ever covers text: decorative objects, devices and cards sit beside the headline or behind it only where every word stays fully readable.
- No text is ever clipped or cut off by its box. Tables and number lists: a header row, aligned columns, numbers right-aligned, no wrapping inside cells, and the table fits its box (on phones it scrolls sideways inside its own box).`;

function pageStream(rules: string, content: string | Anthropic.Beta.BetaContentBlockParam[], fast: boolean, maxTokens: number) {
  return client().beta.messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    betas: fast ? ["server-side-fallback-2026-07-01", "fast-mode-2026-02-01"] : ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    ...(fast ? { speed: "fast" as const } : {}),
    thinking: { type: "adaptive", display: "summarized" },
    output_config: { effort: "low" },
    system: [SYSTEM_TASTE, { type: "text", text: rules }],
    messages: [{ role: "user", content }],
  });
}
export type PageStream = ReturnType<typeof pageStream>;

// fast = Opus 5.5 fast mode (same model, up to ~2.5x the output speed, premium price). The routes fall back to
// standard speed when fast mode is rate limited or unavailable.
// from = the first screen the person approved (and the changes they asked for in chat): the full page keeps it.
export function buildStream(analysis: Analysis, direction: Direction, images: string[], fast = true, from?: { mock?: string; asks?: string[] }) {
  const brief = { site: analysis.site, direction, images };
  const asks = (from?.asks ?? []).filter(Boolean);
  const approved = from?.mock
    ? `\n\nThe person already approved the first screen below${asks.length ? `, after asking for these changes: ${asks.map((a) => `"${a}"`).join("; ")}` : ""}. Keep its nav, hero, palette, fonts, components and every change exactly as they are (reuse its CSS and markup), keep anything else it already contains, and build the rest of the page below it in the same direction, carrying the requested changes through the whole page.\n\nThe approved first screen:\n\n${from.mock}`
    : "";
  return pageStream(BUILD_RULES + "\n\n" + FX_DOCS, `Build it.\n\n${JSON.stringify(brief, null, 2)}${approved}`, fast, 64000);
}

// The first screen only, so the three choices are real pages, not color swatches.
// ref = the market leader this direction is a take on, as a screenshot: the preview matches its general look and quality
export function mockStream(analysis: Analysis, direction: Direction, images: string[], fast = true, ref?: { name: string; shot: string } | null) {
  const brief = { site: analysis.site, direction, images };
  const text = `Draw the first screen.\n\n${JSON.stringify(brief, null, 2)}`;
  if (!ref) return pageStream(MOCK_RULES + "\n\n" + FX_DOCS, text, fast, 16000);
  return pageStream(MOCK_RULES + "\n\n" + FX_DOCS, [
    { type: "text", text: `The reference: the top of ${ref.name}'s homepage right now. Rebuild this first screen for this site so anyone recognizes it as that kind of page: the same layout grid and positions, the same sizes, the same type style and scale, the same kind of main visual, the same nav and density, at the same level of polish. Keep: ${direction.keep}. Then make it this site's: ${direction.change}. Use the direction's palette (keep the reference's lightness) and fonts, this site's words, and a main visual that shows this site's product or world. Never ${ref.name}'s logo, name, mascot, illustrations, photos, copy or brand colors.` },
    { type: "image", source: { type: "base64", media_type: "image/jpeg", data: ref.shot } },
    { type: "text", text },
  ], fast, 16000);
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

/* ───────── 4. the polish pass: fix the small layout problems Chrome found (lib/qa.ts) ───────── */

export async function polishPage(html: string, issues: { size: string; kind: string; where: string }[]): Promise<Edits> {
  const res = await client().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "low", format: zodOutputFormat(Edits) },
    system: [{ type: "text", text: `You polish a finished landing page. Chrome opened it at desktop (1440 wide) and phone (390 wide) sizes and found the layout problems listed. Fix each one with the smallest change that solves it, almost always CSS (sizes, wrapping, positions, z-index, overflow, a media query for phones). Keep the design exactly: same colors, fonts, words, layout idea and motion. Where a device frame or card shows a page screenshot whose words are cut off, replace that image with the same idea built in HTML and CSS that fits. Return exact find/replace edits against the current file (each find must appear in it exactly once). In the reply, say in one short plain sentence what you fixed. Never use em dashes.` }],
    messages: [{ role: "user", content: `Problems found:\n${issues.map((i) => `- [${i.size}] ${i.kind}: ${i.where}`).join("\n")}\n\nCurrent file:\n\n${html}` }],
  });
  if (!res.parsed_output) throw new Error("The polish came back incomplete");
  return res.parsed_output;
}
