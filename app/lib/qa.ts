// The polish pass: opens a finished page in Chrome at desktop and phone size and lists the small layout problems a
// person would notice (text cut off by its box, something covering words, sideways scrolling on a phone, broken
// images, tables that spill out). Claude then fixes only those (lib/claude.ts polishPage).
import type { Browser } from "puppeteer-core";
import { launch } from "./render";

export type Issue = { size: "desktop" | "phone"; kind: string; where: string };

// Runs inside the page. Plain JS on purpose (it is serialized into the browser).
const CHECK = `(async () => {
  const issues = [];
  const add = (kind, where) => { if (issues.length < 40 && !issues.some((i) => i.kind === kind && i.where === where)) issues.push({ kind, where }); };
  const style = document.createElement("style");
  style.textContent = "*{pointer-events:auto!important;transition:none!important}";
  document.head.appendChild(style);
  const cs = (el) => getComputedStyle(el);
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = cs(el); return r.width > 1 && r.height > 1 && s.visibility !== "hidden" && s.display !== "none" && parseFloat(s.opacity) > 0.05; };
  const name = (el) => { const t = (el.innerText || el.getAttribute("alt") || "").trim().replace(/\\s+/g, " ").slice(0, 50); const c = typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\\s+/).slice(0, 2).join(".") : ""; return el.tagName.toLowerCase() + c + (t ? ' "' + t + '"' : ""); };
  const paints = (el) => { const s = cs(el); const bg = s.backgroundColor.match(/rgba?\\(([^)]+)\\)/); const a = bg ? (bg[1].split(",")[3] === undefined ? 1 : parseFloat(bg[1].split(",")[3])) : 0; return a > 0.35 || s.backgroundImage !== "none" || /^(IMG|SVG|CANVAS|VIDEO|PICTURE)$/i.test(el.tagName) || [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()); };
  const W = innerWidth;
  if (document.documentElement.scrollWidth > W + 2) add("the page scrolls sideways", "page is " + document.documentElement.scrollWidth + "px wide at a " + W + "px window");
  const H = document.documentElement.scrollHeight;
  for (let y = 0; y < Math.min(H, 16000); y += Math.round(innerHeight * 0.9)) {
    scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 350));
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight || !vis(el)) continue;
      const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 2);
      const s = cs(el);
      if (ownText) {
        const clipX = /hidden|clip/.test(s.overflowX) || s.textOverflow === "ellipsis";
        const clipY = /hidden|clip/.test(s.overflowY);
        if ((clipX && el.scrollWidth > el.clientWidth + 3) || (clipY && el.scrollHeight > el.clientHeight + 3)) add("text cut off by its box", name(el));
        // text sticking out of a parent that hides overflow (words cut off at a card or device-screen edge)
        let anc = el.parentElement;
        for (let k = 0; anc && k < 6; k++, anc = anc.parentElement) {
          const as = cs(anc);
          if (!/hidden|clip/.test(as.overflowX + as.overflowY)) continue;
          const ar = anc.getBoundingClientRect();
          if (r.right > ar.right + 3 || r.left < ar.left - 3 || r.bottom > ar.bottom + 3) add("text cut off by its box", name(el) + " inside " + name(anc));
          break;
        }
        if (r.right > W + 4 && s.position !== "fixed") add("text runs off the screen", name(el));
        // something painted over these words?
        const range = document.createRange(); range.selectNodeContents(el);
        let covered = null;
        for (const tr of [...range.getClientRects()].filter((q) => q.width > 10 && q.height > 8).slice(0, 6)) {
          for (const f of [0.08, 0.3, 0.5, 0.7, 0.92]) {
            const x = tr.left + tr.width * f, yy = tr.top + tr.height / 2;
            if (yy < 2 || yy > innerHeight - 2 || x < 2 || x > W - 2) continue;
            const top = document.elementFromPoint(x, yy);
            if (top && top !== el && !el.contains(top) && !top.contains(el) && paints(top)) { covered = top; break; }
          }
          if (covered) break;
        }
        if (covered) add("words covered by another element", name(el) + " is under " + name(covered));
      }
      if (el.tagName === "IMG" && el.complete && el.naturalWidth === 0) add("broken image", (el.getAttribute("src") || "").slice(0, 80));
      if (el.tagName === "TABLE" && el.parentElement && el.offsetWidth > el.parentElement.clientWidth + 3 && !/auto|scroll/.test(cs(el.parentElement).overflowX)) add("table spills out of its box", name(el));
    }
  }
  scrollTo(0, 0);
  return issues;
})()`;

async function check(browser: Browser, html: string, width: number, height: number, origin: string): Promise<Omit<Issue, "size">[]> {
  const p = await browser.newPage();
  try {
    await p.setViewport({ width, height });
    // relative paths (the /fx.js motion engine) resolve against the app, as they do in the preview and the live page
    const based = html.replace(/<head[^>]*>/i, (m) => `${m}<base href="${origin}/">`);
    await p.setContent(based, { waitUntil: "load", timeout: 15_000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1200));
    return (await p.evaluate(CHECK)) as Omit<Issue, "size">[];
  } finally { await p.close().catch(() => {}); }
}

/** Best effort: an empty list when Chrome can't run (the page then ships as written). */
export async function checkLayout(html: string, origin: string): Promise<Issue[]> {
  let browser: Browser | null = null;
  try {
    browser = await launch();
    const [desk, phone] = await Promise.all([check(browser, html, 1440, 900, origin), check(browser, html, 390, 844, origin)]);
    return [...desk.map((i) => ({ ...i, size: "desktop" as const })), ...phone.map((i) => ({ ...i, size: "phone" as const }))].slice(0, 30);
  } catch (e) {
    console.error(`[qa] failed: ${e instanceof Error ? e.message : e}`);
    return [];
  } finally {
    const b = browser as Browser | null;
    if (b) b.close().catch(() => {});
  }
}
