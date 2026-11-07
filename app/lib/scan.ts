// Reads a live site and finds the AI tells that can be proven from its HTML and CSS.
// The judgment calls (is this hero generic? is the copy filler?) are left to Claude in /api/analyze.
import { parse, HTMLElement } from "node-html-parser";
import { renderPage } from "./render";

export type Signal = { id: string; label: string; evidence: string; severity: "loud" | "quiet" };
export type Scan = {
  url: string;
  title: string;
  description: string;
  outline: string; // headings, paragraphs and buttons in page order, trimmed
  images: string[];
  fonts: string[];
  colors: string[];
  builtWith: string | null;
  signals: Signal[];
  thin: boolean; // the HTML carried little text (an app that draws itself with JavaScript)
  frameable: boolean; // the site lets itself be shown inside another page (no X-Frame-Options / frame-ancestors)
  rendered: boolean; // read in real Chrome (text after JavaScript, computed styles), not just the raw HTML
  shot: string | null; // the first screen as base64 JPEG, from that render
  pageShot: string | null; // the page as a JPEG data URL, for the before view
};

/** The site refused an automated reader (bot protection). We respect that and ask for a screenshot instead. */
export class BlockedError extends Error {}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

async function get(url: string, ms: number, max = 600_000, meta?: { headers?: Headers }): Promise<string> {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,text/css,*/*" }, redirect: "follow", signal: AbortSignal.timeout(ms) });
  if ([401, 403, 429, 503].includes(res.status)) throw new BlockedError(`answered ${res.status}`);
  if (!res.ok) throw new Error(`The site answered ${res.status}`);
  if (meta) meta.headers = res.headers;
  const text = await res.text();
  return text.slice(0, max);
}

export function normalizeUrl(input: string): string {
  let u = input.trim();
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  let parsed: URL;
  try { parsed = new URL(u); } catch { throw new Error("That doesn't look like a web address"); }
  if (/\s/.test(input.trim())) throw new Error("That doesn't look like a web address");
  const localTest = process.env.NODE_ENV === "development" && parsed.hostname === "localhost";
  if (!/\./.test(parsed.hostname) && !localTest) throw new Error("That doesn't look like a web address");
  return parsed.toString();
}

const hueOf = (hex: string) => {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m.slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16) / 255, g = parseInt(full.slice(2, 4), 16) / 255, b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max - min < 0.12) return -1; // grey
  let h = 0;
  if (max === r) h = ((g - b) / (max - min)) % 6;
  else if (max === g) h = (b - r) / (max - min) + 2;
  else h = (r - g) / (max - min) + 4;
  return (h * 60 + 360) % 360;
};

const FILLER = /\b(elevate[sd]?|supercharge[sd]?|unleash(es|ed)?|seamless(ly)?|revolutioni[sz]e[sd]?|next[- ]gen(eration)?|cutting[- ]edge|empower(s|ing)?|effortless(ly)?|game[- ]chang(er|ing)|unlock (your|the)|transform (your|the)|world[- ]class|state[- ]of[- ]the[- ]art|harness the power)\b/gi;
const DEFAULT_FONTS = /^(inter|roboto|arial|helvetica|open sans|system-ui|-apple-system|segoe ui|sans-serif|poppins|montserrat)$/i;

function textOf(el: HTMLElement) {
  return el.text.replace(/\s+/g, " ").trim();
}

export async function scanSite(input: string): Promise<Scan> {
  const url = normalizeUrl(input);
  const meta: { headers?: Headers } = {};
  const html = await get(url, 12_000, 600_000, meta);
  const frameable = !meta.headers?.get("x-frame-options") && !/frame-ancestors/i.test(meta.headers?.get("content-security-policy") ?? "");
  if (/<title>\s*(Just a moment|Attention Required|Access denied)|cf-chl-|challenge-platform|captcha-delivery/i.test(html.slice(0, 20000))) throw new BlockedError("shows a bot check");
  const renderJob = renderPage(url); // runs while the stylesheets below are fetched
  const root0 = parse(html, { comment: false });
  const base = new URL(url);
  const abs = (s: string) => { try { return new URL(s, base).toString(); } catch { return ""; } };

  // CSS: inline <style> plus the first two stylesheets
  let css = root0.querySelectorAll("style").map((s) => s.text).join("\n");
  const sheets = root0.querySelectorAll('link[rel="stylesheet"]').map((l) => abs(l.getAttribute("href") ?? "")).filter(Boolean).slice(0, 3);
  for (const s of sheets) { try { css += "\n" + (await get(s, 6000, 400_000)); } catch { /* a blocked sheet is fine */ } }
  const r = await renderJob;
  const root = r ? parse(r.html, { comment: false }) : root0; // the page as a person sees it, when Chrome could open it
  if (r) css += "\n" + root.querySelectorAll("style").map((x) => x.text).join("\n");
  const classes = root.querySelectorAll("[class]").map((e) => e.getAttribute("class") ?? "").join(" ");

  const title = (root0.querySelector("title") ?? root.querySelector("title"))?.text.trim() ?? "";
  const description = root0.querySelector('meta[name="description"]')?.getAttribute("content") ?? root0.querySelector('meta[property="og:description"]')?.getAttribute("content") ?? "";

  // the page's words in order
  root.querySelectorAll("script,style,noscript,svg").forEach((n) => n.remove());
  const lines: string[] = [];
  for (const el of root.querySelectorAll("h1,h2,h3,h4,p,li,a,button,blockquote,figcaption,span.badge,[class*=eyebrow]")) {
    const t = textOf(el);
    if (!t || t.length < 2 || t.length > 400) continue;
    const tag = el.tagName.toLowerCase();
    const prefix = /^h[1-4]$/.test(tag) ? tag.toUpperCase() + ": " : tag === "button" || (tag === "a" && /btn|button/i.test(el.getAttribute("class") ?? "")) ? "BUTTON: " : tag === "a" ? "" : "";
    if (tag === "a" && !prefix && t.split(" ").length < 3) continue;
    const line = prefix + t;
    if (lines[lines.length - 1] !== line) lines.push(line);
  }
  const outline = lines.join("\n").slice(0, 14_000);
  const visible = lines.join(" ");

  const images = [...new Set([
    ...root.querySelectorAll("img").map((i) => i.getAttribute("src") ?? i.getAttribute("data-src") ?? ""),
  ].map(abs).filter((s) => s && !/\.svg($|\?)|icon|logo-?small|pixel|tracking|1x1|data:|og[-_]?image|opengraph|social|share[-_]|twitter[-_]?card|screenshot/i.test(s)))].slice(0, 16);

  const fontFamilies = [...css.matchAll(/font-family\s*:\s*([^;}{]+)/gi)].map((m) => m[1].split(",")[0].replace(/["']/g, "").trim());
  const gFonts = [...html.matchAll(/fonts\.googleapis\.com\/css2?\?family=([^"'&]+)/g)].map((m) => decodeURIComponent(m[1]).split(":")[0].replace(/\+/g, " "));
  const fontCount = new Map<string, number>();
  for (const f of [...gFonts, ...fontFamilies]) if (f && !/^var\(|inherit|initial/i.test(f)) fontCount.set(f, (fontCount.get(f) ?? 0) + 1);
  const computed = [r?.fonts.heading, r?.fonts.body].filter((f): f is string => !!f);
  const fonts = [...new Set([...computed, ...[...fontCount.entries()].sort((a, b) => b[1] - a[1]).map(([f]) => f)])].slice(0, 6);

  const hexes = [...css.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)].map((m) => "#" + m[1].toLowerCase());
  const colorCount = new Map<string, number>();
  for (const h of hexes) colorCount.set(h, (colorCount.get(h) ?? 0) + 1);
  const colors = [...colorCount.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c).slice(0, 10);

  const signals: Signal[] = [...(r?.signals ?? [])]; // measured in Chrome first: those are proof
  const add = (s: Signal) => { if (!signals.some((x) => x.id === s.id)) signals.push(s); };

  // a real gradient declaration (short, with its own color stops) where at least two stops are violet to pink
  const gradients = [...css.matchAll(/linear-gradient\([^;{}]{0,160}?\)\s*[;}"]/gi)].map((m) => m[0]);
  const purpleGrad = gradients.find((g) => { const hs = [...g.matchAll(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi)].map((m) => hueOf(m[0])); const colored = hs.filter((h) => h >= 0), purple = colored.filter((h) => h >= 240 && h <= 335); return purple.length >= 2 && purple.length / colored.length >= 0.66; });
  const twPurple = /\b(from|via|to)-(purple|violet|indigo|fuchsia|pink)-\d{3}\b/.exec(classes);
  if (purpleGrad || twPurple) add({ id: "purple-gradient", label: "Purple to pink gradient", evidence: (purpleGrad ?? twPurple![0]).slice(0, 120), severity: "loud" });

  const dashes = (visible.match(/[—–]/g) ?? []).length;
  if (dashes) add({ id: "em-dash", label: "Em dashes in the copy", evidence: `${dashes} found, e.g. "${(visible.match(/[^.]{0,40}[—–][^.]{0,40}/) ?? [""])[0].trim()}"`, severity: "quiet" });

  const filler = [...new Set((visible.match(FILLER) ?? []).map((w) => w.toLowerCase()))];
  if (filler.length) add({ id: "filler-words", label: "Filler words", evidence: filler.slice(0, 6).map((w) => `"${w}"`).join(", "), severity: "loud" });

  const primary = fonts[0];
  if (!fonts.length || (primary && DEFAULT_FONTS.test(primary))) add({ id: "default-font", label: "Default font", evidence: primary ? `${primary} everywhere` : "no custom typeface loaded", severity: "quiet" });

  // glass only counts on cards (a blurred sticky nav is normal)
  if (/\.[\w-]*card[\w-]*[^{]*\{[^}]*backdrop-filter/i.test(css) || /class="[^"]*(card[^"]*backdrop-blur|backdrop-blur[^"]*card)/i.test(html)) add({ id: "glass", label: "Glassmorphism cards", evidence: "frosted, blurred cards", severity: "quiet" });
  // three same cards: a three-column grid whose children are "card"s
  const threeGrid = root.querySelectorAll("[class]").find((el) => /\b(md|lg):grid-cols-3\b|\bgrid-cols-3\b|\bgrid\b/.test(el.getAttribute("class") ?? "") && el.childNodes.filter((c) => c instanceof HTMLElement && /card|feature/i.test(c.getAttribute("class") ?? "")).length === 3);
  if (threeGrid) add({ id: "three-cards", label: "Three same cards", evidence: threeGrid.querySelectorAll("h3,h4").map((h) => textOf(h)).slice(0, 3).join(" / ") || "a row of three identical cards", severity: "loud" });
  if (/\buppercase\b[^"]*\btracking-(wide|wider|widest|\[)/.test(classes) || /\btracking-(wide|wider|widest)\b[^"]*\buppercase\b/.test(classes)) add({ id: "eyebrow", label: "Eyebrow labels", evidence: "small uppercase tracked labels over headings", severity: "loud" });
  if (/[\u{1F300}-\u{1FAFF}✨]/u.test(lines.filter((l) => /^H\d/.test(l)).join(" "))) add({ id: "emoji-headings", label: "Emoji in headings", evidence: lines.find((l) => /^H\d/.test(l) && /[\u{1F300}-\u{1FAFF}✨]/u.test(l))?.slice(0, 80) ?? "", severity: "loud" });
  if (/BUTTON: (Get Started|Get started)/.test(outline) && /Learn More|Learn more/.test(outline)) add({ id: "default-buttons", label: "Default buttons", evidence: '"Get Started" next to "Learn More"', severity: "loud" });
  if (/(0[1-9]|Step [1-9])\s*[./:]/.test(visible)) add({ id: "numbered-labels", label: "Numbered section labels", evidence: (visible.match(/(0[1-9]|Step [1-9])\s*[./:][^.]{0,30}/) ?? [""])[0], severity: "quiet" });

  const both = html + (r?.html ?? ""); // the badge is often added by JavaScript
  const builtWith = /lovable\.(app|dev)|gpt-engineer|Edit with Lovable/i.test(both) ? "Lovable" : /bolt\.new|stackblitz/i.test(both) ? "Bolt" : /v0\.dev|v0\.app/i.test(both) ? "v0" : /framer\.(com|app|website)/i.test(both) ? "Framer" : /wix\.com|wixstatic/i.test(both) ? "Wix" : /squarespace/i.test(both) ? "Squarespace" : null;

  return { url, title, description, outline, images, fonts, colors, builtWith, signals, thin: outline.length < 400, frameable, rendered: !!r, shot: r?.shot ?? null, pageShot: r?.page ?? null };
}
