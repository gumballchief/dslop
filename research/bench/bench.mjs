// DSlop bench: runs the real /api/analyze on a labeled list of sites and checks the answers against the real pages.
//   node bench.mjs [app=http://localhost:3090] [only=substring] [out=run-name]
// For every site it also renders the page in local Chrome (its text after JavaScript, and a screenshot), so it can check
// that every quote DSlop cites and every number in its facts is really on the page.
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { CHROME } from "../chrome.mjs";

const arg = (k, d) => (process.argv.find((a) => a.startsWith(k + "=")) ?? "").slice(k.length + 1) || d;
const APP = arg("app", "http://localhost:3090");
const ONLY = arg("only", "").split("|").filter(Boolean);
const RUN = arg("out", "run1");
const HERE = import.meta.dirname;
const OUT = path.join(HERE, RUN);
fs.mkdirSync(path.join(OUT, "shots"), { recursive: true });
const { sites } = JSON.parse(fs.readFileSync(path.join(HERE, "sites.json"), "utf8"));
const list = sites.filter((s) => !ONLY.length || ONLY.some((o) => s.url.includes(o) || s.group === o));
const nap = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (u) => u.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 60) || "x";
const norm = (s) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();

const BANNED = /\b(elevate|supercharge|unleash|seamless|transform|empower|next-gen|cutting-edge|revolutioni[sz]e|effortless)/i;

async function render(browser, url) {
  if (!/^https?:\/\//.test(url)) return null;
  const p = await browser.newPage();
  try {
    await p.setViewport({ width: 1440, height: 900 });
    await p.goto(url, { waitUntil: "networkidle2", timeout: 35000 }).catch(() => {});
    await nap(2500);
    const text = await p.evaluate(() => document.body?.innerText ?? "").catch(() => "");
    const html = await p.content().catch(() => "");
    const png = await p.screenshot({ type: "png" }).catch(() => null);
    if (png) await sharp(png).resize(720).jpeg({ quality: 78 }).toFile(path.join(OUT, "shots", slug(url) + ".jpg"));
    const raw = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 Chrome/131.0" }, signal: AbortSignal.timeout(10000) }).then((r) => r.text()).catch(() => "");
    return { text, html, raw };
  } finally { await p.close().catch(() => {}); }
}

function quotesIn(s) {
  return [...String(s).matchAll(/["“]([^"”]{4,160})["”]/g)].map((m) => m[1]);
}
const cssy = (q) => /#[0-9a-f]{3,6}\b|gradient|px\b|rgba?\(|font-family|backdrop|tracking|uppercase|class=|\{|\}/i.test(q);

function check(site, a, page) {
  const notes = [];
  const hay = page ? norm(page.text + " " + page.html.replace(/<[^>]+>/g, " ") + " " + page.html + " " + (page.raw ?? "")) : "";
  // quotes DSlop puts in evidence, strengths and the verdict must be on the page
  const quoted = [...a.tells.flatMap((t) => quotesIn(t.evidence)), ...a.strengths.flatMap(quotesIn), ...quotesIn(a.verdict)];
  const missing = page ? quoted.filter((q) => !cssy(q) && !hay.includes(norm(q).replace(/\.\.\.$/, "").slice(0, 60))) : [];
  // numbers in the facts must be on the page (no invented stats)
  const nums = a.site.facts.flatMap((f) => [...f.matchAll(/\$\s?\d[\d,.]*|\d[\d,.]*\s?%|\b\d{2,}[\d,.]*\b/g)].map((m) => m[0].replace(/\s/g, "")));
  const hayNum = page ? (page.text + page.html).replace(/\s/g, "") : "";
  const badNums = page ? [...new Set(nums.filter((n) => !hayNum.includes(n.replace(/[.,]$/, ""))))] : [];
  const text = JSON.stringify([a.verdict, a.tells, a.strengths, a.directions.map((d) => [d.headline, d.subline, d.cta, d.why])]);
  if (/[—–]/.test(text.replace(/\\"[^"]*?\\"|“[^”]*”/g, ""))) notes.push("em/en dash in DSlop's own words");
  const banned = a.directions.map((d) => `${d.headline} ${d.subline} ${d.cta}`).filter((s) => BANNED.test(s));
  if (banned.length) notes.push(`banned word in a direction: ${banned[0].slice(0, 80)}`);
  if (missing.length) notes.push(`${missing.length}/${quoted.length} quotes not found on the page: ${missing.slice(0, 3).map((q) => `"${q.slice(0, 50)}"`).join(", ")}`);
  if (badNums.length) notes.push(`numbers in facts not on the page: ${badNums.slice(0, 5).join(", ")}`);
  const s = a.score;
  let band = "n/a";
  if (site.group === "crafted") band = s < 40 ? "ok" : "MISS (crafted scored as slop)";
  if (site.group === "slop") band = s >= 70 ? "ok" : "MISS (slop scored too low)";
  if (site.group === "template") band = s < 70 ? "ok" : "MISS (template scored as AI slop)";
  return { band, notes, quoted: quoted.length, missing, badNums };
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--hide-scrollbars"] });
const results = [];
let next = 0;
async function worker() {
  while (next < list.length) {
    const site = list[next++];
    const t = Date.now();
    let res, data, err = null, appSeconds = 0;
    const [page] = await Promise.all([
      render(browser, site.url).catch(() => null),
      (async () => {
        try {
          const t0 = Date.now();
          res = await fetch(APP + "/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: site.url }) });
          data = await res.json();
          appSeconds = Math.round((Date.now() - t0) / 100) / 10;
        } catch (e) { err = String(e); }
      })(),
    ]);
    const seconds = appSeconds || Math.round((Date.now() - t) / 100) / 10;
    const r = { url: site.url, group: site.group, seconds, status: res?.status ?? 0 };
    if (err || !res?.ok) {
      r.error = data?.error ?? err; r.code = data?.code ?? null;
      r.band = site.expect === "blocked" ? (r.code === "blocked" ? "ok" : "MISS (expected the blocked message)") : site.expect === "error" ? "ok" : "MISS (failed on a real site)";
    } else {
      const a = data.analysis;
      Object.assign(r, { score: a.score, from: data.from, builtWith: data.scan?.builtWith ?? null, rendered: data.scan?.rendered ?? false, name: a.site.name, verdict: a.verdict, tells: a.tells.map((x) => x.label), strengths: a.strengths, facts: a.site.facts, directions: a.directions.map((d) => d.name), renderedChars: page?.text.length ?? 0, thinHtml: data.scan?.signals ? undefined : undefined });
      Object.assign(r, check(site, a, page));
      if (site.expect) r.band = "MISS (expected a failure, got a score)";
    }
    results.push(r);
    console.log(`${r.band === "ok" || r.band === "n/a" ? "  " : "XX"} ${String(r.score ?? "-").padStart(3)} ${site.group.padEnd(8)} ${seconds}s ${site.url}${r.error ? "  ERR " + r.error.slice(0, 90) : ""}${r.notes?.length ? "  | " + r.notes.join(" | ") : ""}`);
    fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 1));
  }
}
await Promise.all([worker(), worker(), worker(), worker()]);
await browser.close();

// report
const by = (g) => results.filter((r) => r.group === g);
const line = (r) => `| ${r.url.replace(/^https?:\/\//, "").slice(0, 40)} | ${r.group} | ${r.score ?? "-"} | ${r.band} | ${r.seconds}s | ${(r.error ?? r.verdict ?? "").replace(/\|/g, "/").slice(0, 120)} | ${(r.notes ?? []).join("; ").replace(/\|/g, "/").slice(0, 160)} |`;
const md = [`# DSlop bench (${RUN}), ${results.length} sites, app ${APP}`, "",
  ...["crafted", "slop", "template", "ai-built", "edge"].map((g) => { const rs = by(g); const ok = rs.filter((r) => r.band === "ok").length; return `- ${g}: ${rs.length} sites${g === "ai-built" ? `, scores ${rs.map((r) => r.score ?? "err").join(" ")}` : `, ${ok} right`}`; }),
  `- quotes checked: ${results.reduce((n, r) => n + (r.quoted ?? 0), 0)}, not found on the page: ${results.reduce((n, r) => n + (r.missing?.length ?? 0), 0)}`,
  `- invented-looking numbers in facts: ${results.reduce((n, r) => n + (r.badNums?.length ?? 0), 0)}`,
  `- median time: ${results.map((r) => r.seconds).sort((a, b) => a - b)[Math.floor(results.length / 2)]}s`,
  "", "| site | group | score | band | time | verdict / error | checks |", "|---|---|---|---|---|---|---|", ...results.map(line)].join("\n");
fs.writeFileSync(path.join(OUT, "report.md"), md);
console.log("\n" + md.split("\n").slice(0, 9).join("\n"));
