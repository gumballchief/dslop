// Opens a page in a real headless Chrome, the way a person sees it: the text after JavaScript runs, a screenshot,
// and the computed styles that prove AI-template habits (gradient text, glow, pill labels over the headline, the
// real fonts). Only ever called for a site that already answered a plain request, so it never gets past a bot check.
// On Vercel it uses @sparticuz/chromium; locally it uses the Chrome installed on the machine.
import type { Browser } from "puppeteer-core";
import type { Signal } from "./scan";

export type Rendered = {
  html: string;
  text: string;
  shot: string; // the first screen, 1440x900 JPEG, base64 (what Claude looks at)
  page: string; // the page down to 3600 px, JPEG data URL (the "before" picture)
  fonts: { heading: string | null; body: string | null };
  signals: Signal[];
};

const LOCAL_CHROME = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].filter(Boolean) as string[];

export async function launch(): Promise<Browser> {
  const puppeteer = (await import("puppeteer-core")).default;
  if (process.env.VERCEL) {
    const chromium = (await import("@sparticuz/chromium")).default;
    chromium.setGraphicsMode = false; // no WebGL: starts faster, and a landing page reads fine without it
    return puppeteer.launch({
      args: await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
      executablePath: await chromium.executablePath(),
      headless: "shell",
      defaultViewport: { width: 1440, height: 900 },
    });
  }
  const fs = await import("node:fs");
  const exe = LOCAL_CHROME.find((p) => fs.existsSync(p));
  if (!exe) throw new Error("no local Chrome");
  return puppeteer.launch({ executablePath: exe, headless: true, args: ["--hide-scrollbars"], defaultViewport: { width: 1440, height: 900 } });
}

// Runs inside the page. Plain JS on purpose (it is serialized into the browser).
const PROBE = `(() => {
  const out = { fonts: {}, gradText: [], glow: [], eyebrow: null, purpleBg: null, emoji: [] };
  const cs = (el) => getComputedStyle(el);
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < 2600; };
  const first = (f) => (f || "").split(",")[0].replace(/["']/g, "").trim() || null;
  const h1 = [...document.querySelectorAll("h1")].find(vis) || [...document.querySelectorAll("h2")].find(vis);
  out.fonts.heading = h1 ? first(cs(h1).fontFamily) : null;
  out.fonts.body = first(cs(document.querySelector("p") || document.body).fontFamily);
  const hueOf = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx - mn < 0.15) return -1; let h; if (mx === r) h = ((g - b) / (mx - mn)) % 6; else if (mx === g) h = (b - r) / (mx - mn) + 2; else h = (r - g) / (mx - mn) + 4; return (h * 60 + 360) % 360; };
  const colorsIn = (s) => [...s.matchAll(/rgba?\\(([\\d.]+),\\s*([\\d.]+),\\s*([\\d.]+)/g)].map((m) => hueOf(+m[1], +m[2], +m[3]));
  const purplish = (s) => { const hs = colorsIn(s).filter((h) => h >= 0); const p = hs.filter((h) => h >= 245 && h <= 335); return hs.length >= 2 && p.length >= 1 && p.length / hs.length >= 0.5; };
  for (const el of document.querySelectorAll("h1, h2, h3, h1 *, h2 *, h3 *")) {
    if (!vis(el)) continue;
    const s = cs(el);
    if (/text/.test(s.backgroundClip + " " + (s.webkitBackgroundClip || "")) && /gradient/.test(s.backgroundImage)) out.gradText.push(el.textContent.trim().slice(0, 70));
    if (/[\\u{1F300}-\\u{1FAFF}\\u2728]/u.test(el.textContent)) out.emoji.push(el.textContent.trim().slice(0, 60));
  }
  out.gradText = [...new Set(out.gradText)].slice(0, 3);
  out.emoji = [...new Set(out.emoji)].slice(0, 3);
  let n = 0;
  for (const el of document.querySelectorAll("body *")) {
    if (++n > 4000) break;
    const r = el.getBoundingClientRect();
    if (r.top > 2000 || r.width < 40) continue;
    const s = cs(el);
    // glow: a colored shadow with a big blur and no offset
    for (const sh of [s.boxShadow, s.textShadow]) {
      if (!sh || sh === "none") continue;
      const m = sh.match(/rgba?\\(([\\d.]+),\\s*([\\d.]+),\\s*([\\d.]+)(?:,\\s*([\\d.]+))?\\)\\s+(-?[\\d.]+)px\\s+(-?[\\d.]+)px\\s+([\\d.]+)px/);
      if (m && hueOf(+m[1], +m[2], +m[3]) >= 0 && Math.abs(+m[5]) < 2 && Math.abs(+m[6]) < 2 && +m[7] >= 16 && (m[4] === undefined || +m[4] > 0.15)) out.glow.push((el.textContent || el.tagName).trim().slice(0, 40));
    }
    // a big violet-to-pink gradient behind the top of the page
    if (!out.purpleBg && r.width > 600 && r.height > 200 && /gradient/.test(s.backgroundImage) && purplish(s.backgroundImage)) out.purpleBg = s.backgroundImage.slice(0, 140);
  }
  out.glow = [...new Set(out.glow)].slice(0, 3);
  // the small pill or uppercase label just above the main headline
  if (h1) {
    const hr = h1.getBoundingClientRect();
    for (const el of document.querySelectorAll("span, p, div, a, small")) {
      const t = (el.textContent || "").trim();
      if (!t || t.length > 60 || el.children.length > 2 || !vis(el)) continue;
      const r = el.getBoundingClientRect(), s = cs(el);
      const above = r.bottom <= hr.top + 4 && hr.top - r.bottom < 90 && Math.abs((r.left + r.width / 2) - (hr.left + hr.width / 2)) < hr.width;
      const pill = parseFloat(s.borderTopLeftRadius) >= 12 && (s.backgroundColor !== "rgba(0, 0, 0, 0)" || s.borderTopWidth !== "0px");
      const caps = s.textTransform === "uppercase" && parseFloat(s.letterSpacing) > 0.5;
      if (above && parseFloat(s.fontSize) <= 16 && (pill || caps)) { out.eyebrow = t; break; }
    }
  }
  return out;
})()`;

/** Best effort: returns null when the page won't open in time. */
export async function renderPage(url: string, budgetMs = 30_000): Promise<Rendered | null> {
  let browser: Browser | null = null;
  let done = false; // set when the budget runs out, so a late launch still gets closed
  const t0 = Date.now();
  let step = "launch";
  let clock: ReturnType<typeof setTimeout> | undefined;
  const timer = new Promise<null>((res) => { clock = setTimeout(() => { console.error(`[render] ${url} ran out of time at "${step}" after ${Date.now() - t0} ms`); res(null); }, budgetMs); });
  const work = (async (): Promise<Rendered | null> => {
    browser = await launch();
    console.error(`[render] ${url} chrome up in ${Date.now() - t0} ms`);
    if (done) { await browser.close().catch(() => {}); return null; }
    step = "open";
    const p = await browser.newPage();
    await p.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36");
    const res = await p.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 });
    step = "settle";
    if (!res || res.status() >= 400) { console.error(`[render] ${url} answered ${res?.status()}`); return null; }
    await p.waitForNetworkIdle({ idleTime: 500, timeout: 4500 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 900)); // let entrance animations settle
    const title = await p.title();
    if (/just a moment|attention required|access denied|captcha/i.test(title)) return null; // a bot check: not ours to read
    step = "read";
    const [html, text] = await Promise.all([p.content(), p.evaluate(() => document.body?.innerText ?? "")]);
    step = "shot";
    const shot = Buffer.from(await p.screenshot({ type: "jpeg", quality: 72 })).toString("base64");
    const height = Math.min(2700, await p.evaluate(() => document.documentElement.scrollHeight));
    const pageShot = height > 900
      ? Buffer.from(await p.screenshot({ type: "jpeg", quality: 55, clip: { x: 0, y: 0, width: 1440, height }, captureBeyondViewport: true })).toString("base64")
      : shot;
    step = "probe";
    const probe = (await p.evaluate(PROBE)) as { fonts: { heading: string | null; body: string | null }; gradText: string[]; glow: string[]; eyebrow: string | null; purpleBg: string | null; emoji: string[] };
    const signals: Signal[] = [];
    if (probe.gradText.length) signals.push({ id: "gradient-text", label: "Gradient text in headings", evidence: probe.gradText.map((t) => `"${t}"`).join(", "), severity: "loud" });
    if (probe.purpleBg) signals.push({ id: "purple-gradient", label: "Purple to pink gradient", evidence: `computed background: ${probe.purpleBg}`, severity: "loud" });
    if (probe.glow.length) signals.push({ id: "glow", label: "Glow effects", evidence: `colored glow on ${probe.glow.map((t) => `"${t}"`).join(", ")}`, severity: "loud" });
    if (probe.eyebrow) signals.push({ id: "eyebrow", label: "Pill label over the headline", evidence: `"${probe.eyebrow}" sits above the main headline`, severity: "loud" });
    if (probe.emoji.length) signals.push({ id: "emoji-headings", label: "Emoji in headings", evidence: probe.emoji.map((t) => `"${t}"`).join(", "), severity: "loud" });
    console.error(`[render] ${url} ok in ${Date.now() - t0} ms`);
    return { html, text, shot, page: `data:image/jpeg;base64,${pageShot}`, fonts: probe.fonts, signals };
  })().catch((e) => { console.error(`[render] ${url} failed at "${step}": ${e instanceof Error ? e.message : e}`); return null; });
  try {
    return await Promise.race([work, timer]);
  } finally {
    done = true;
    clearTimeout(clock);
    const b = browser as Browser | null;
    if (b) b.close().catch(() => {});
  }
}

/** The first screen of several sites at once (one Chrome, a tab each), as small JPEGs (base64), for studying a market.
 *  Best effort: a site that won't open, errors, or shows a bot check comes back null. */
export async function shootMany(urls: string[], budgetMs = 32_000): Promise<(string | null)[]> {
  const out: (string | null)[] = urls.map(() => null);
  let browser: Browser | null = null;
  let done = false;
  let clock: ReturnType<typeof setTimeout> | undefined;
  const t0 = Date.now();
  const timer = new Promise<void>((res) => { clock = setTimeout(res, budgetMs); });
  const work = (async () => {
    browser = await launch();
    if (done) { await browser.close().catch(() => {}); return; }
    const shoot = async (url: string, i: number) => {
      try {
        const p = await browser!.newPage();
        await p.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36");
        const res = await p.goto(url, { waitUntil: "domcontentloaded", timeout: 14_000 });
        if (!res || res.status() >= 400) return;
        await p.waitForNetworkIdle({ idleTime: 500, timeout: 4000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 900));
        if (/just a moment|attention required|access denied|captcha/i.test(await p.title())) return; // a bot check: not ours to read
        if (((await p.evaluate(() => document.body?.innerText.trim().length ?? 0)) as number) < 40) return; // loaded blank: nothing to study
        out[i] = Buffer.from(await p.screenshot({ type: "jpeg", quality: 62, clip: { x: 0, y: 0, width: 1440, height: 900, scale: 0.6 } })).toString("base64");
      } catch (e) {
        console.error(`[market] ${url} failed: ${e instanceof Error ? e.message : e}`);
      }
    };
    await Promise.all(urls.map(shoot));
    // one more try for any that failed, if there is time left (a busy moment, a slow first paint)
    const retry = urls.map((u, i) => [u, i] as const).filter(([, i]) => !out[i]);
    if (retry.length && Date.now() - t0 < budgetMs - 14_000) await Promise.all(retry.map(([u, i]) => shoot(u, i)));
  })().catch((e) => console.error(`[market] chrome failed: ${e instanceof Error ? e.message : e}`));
  await Promise.race([work, timer]);
  done = true;
  clearTimeout(clock);
  const b = browser as Browser | null;
  if (b) b.close().catch(() => {});
  console.error(`[market] ${out.filter(Boolean).length}/${urls.length} leaders seen in ${Date.now() - t0} ms`);
  return out;
}
