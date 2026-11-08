// The film's demo, run through today's real flow (local app + live publish):
// read -> market study -> six directions -> six previews (market ones drawn from the leader's screenshot) -> one chat
// message -> build from the first "our take" preview -> polish -> a slop request refused -> publish -> screenshots.
//   node demos3.mjs            (needs the local app on 3090)
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { CHROME } from "./chrome.mjs";

const APP = "http://localhost:3090", PROD = "https://dslop.vercel.app";
const OUT = new URL("../film/public/demo3/", import.meta.url);
const at = (n) => fileURLToPath(new URL(n, OUT));
fs.mkdirSync(at("."), { recursive: true });
const DATA = fileURLToPath(new URL("../film/src/demo3.json", import.meta.url));
const data = {};
const save = () => fs.writeFileSync(DATA, JSON.stringify(data, null, 1));
const t0 = Date.now();
const log = (...a) => console.log(`${Math.round((Date.now() - t0) / 1000)}s`, ...a);
const post = async (base, path, body) => {
  const r = await fetch(base + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(`${path} ${r.status}: ${j.error}`);
  return j;
};
async function stream(path, body) {
  const r = await fetch(APP + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  const reader = r.body.getReader(), dec = new TextDecoder();
  let buf = "", page = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
      if (!line.trim()) continue;
      const ev = JSON.parse(line);
      if (ev.t === "html") page += ev.d; else if (ev.t === "error") throw new Error(ev.m);
    }
  }
  return page.replace(/^```html\s*/i, "").replace(/```\s*$/, "").trim();
}

// 1. read
const a = await post(APP, "/api/analyze", { url: `${APP}/samples/bloomly.html` });
data.analysis = a.analysis; data.scan = a.scan; save();
if (a.shot) fs.writeFileSync(at("before.jpg"), Buffer.from(a.shot.split(",")[1], "base64"));
log("read", a.analysis.score, a.analysis.market.name, a.analysis.market.leaders.map((l) => l.name).join(", "));
// 2. market study + six directions
const d = await post(APP, "/api/directions", { analysis: a.analysis });
const full = { ...a.analysis, directions: d.directions, conventions: d.conventions };
data.directions = d.directions; data.conventions = d.conventions;
data.leaders = d.leaders.map((l, i) => { if (l.thumb) fs.writeFileSync(at(`leader-${i}.jpg`), Buffer.from(l.thumb.split(",")[1], "base64")); return { name: l.name, url: l.url, seen: !!l.thumb }; });
save(); log("leaders", data.leaders.map((l) => `${l.name}${l.seen ? "" : " (not opened)"}`).join(", "));
// 3. six previews, the market ones drawn from their leader's screenshot
const images = a.scan?.images ?? [];
const mocks = await Promise.all(full.directions.map((dir) => {
  const lead = dir.group === "market" ? d.leaders.find((l) => l.thumb && l.name.toLowerCase() === (dir.ref ?? "").toLowerCase()) : null;
  return stream("/api/mock", { analysis: full, direction: dir, images, ref: lead ? { name: lead.name, shot: lead.thumb } : undefined });
}));
mocks.forEach((m, i) => fs.writeFileSync(at(`mock-${i}.html`), m));
log("six previews drawn");
// 4. one chat message
const ask1 = "It's a neighborhood shop on Alberta Street, keep it warm and friendly";
const t = await post(APP, "/api/talk", { analysis: full, message: ask1, history: [] });
data.talk = { ask: ask1, reply: t.reply, changed: t.changes.map((c) => c.index) };
for (const c of t.changes) {
  full.directions[c.index] = c.direction;
  const dir = c.direction;
  const lead = dir.group === "market" ? d.leaders.find((l) => l.thumb && l.name.toLowerCase() === (dir.ref ?? "").toLowerCase()) : null;
  mocks[c.index] = await stream("/api/mock", { analysis: full, direction: dir, images, ref: lead ? { name: lead.name, shot: lead.thumb } : undefined });
  fs.writeFileSync(at(`mock-${c.index}.html`), mocks[c.index]);
}
data.directions = full.directions; save(); log("chat:", t.reply, "| redrew", t.changes.length);
// 5. build the first "our take" one, then the polish pass
const pick = Math.max(0, full.directions.findIndex((x) => x.group === "market"));
const bt = Date.now();
let page = await stream("/api/build", { analysis: full, direction: full.directions[pick], images, mock: mocks[pick], asks: [ask1] });
const pol = await post(APP, "/api/polish", { html: page });
page = pol.html;
data.build = { pick, seconds: Math.round((Date.now() - bt) / 1000), lines: page.split("\n").length, polished: pol.fixed, polishReply: pol.reply, effects: [...new Set([...page.matchAll(/data-fx="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)))], reveals: (page.match(/data-reveal/g) ?? []).length };
fs.writeFileSync(at("built.html"), page); save(); log("built", data.build);
// 6. a slop request, refused
const ask2 = "Make the hero a purple to pink gradient with a glow behind the headline";
const e = await post(APP, "/api/edit", { html: page, ask: ask2, direction: full.directions[pick] });
data.edit = { ask: ask2, reply: e.reply }; fs.writeFileSync(at("edited.html"), e.html); save(); log("edit:", e.reply);
// 7. publish live
const pub = await post(PROD, "/api/publish", { html: e.html, name: full.site.name });
data.published = { ...pub, url: PROD + pub.path }; save(); log("published", data.published.url);
// 8. screenshots (the engine loads from the app, like in the real preview)
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--hide-scrollbars"] });
const p = await b.newPage();
const based = (h) => h.replace(/<head[^>]*>/i, (m) => `${m}<base href="${APP}/">`);
for (let i = 0; i < 6; i++) {
  await p.setViewport({ width: 1440, height: 900 });
  await p.setContent(based(mocks[i]), { waitUntil: "load", timeout: 30000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2200));
  await p.mouse.move(980, 420); await new Promise((r) => setTimeout(r, 600));
  await sharp(await p.screenshot({ type: "png" })).jpeg({ quality: 84 }).toFile(at(`mock-${i}.jpg`));
}
await p.setViewport({ width: 1440, height: 900 });
await p.setContent(based(e.html), { waitUntil: "load", timeout: 30000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 2500));
const H = await p.evaluate(() => document.documentElement.scrollHeight);
const frames = [];
for (let k = 0, y = 0; k < 6 && y < H - 900; k++, y = Math.round((H - 900) * (k / 5))) {
  await p.evaluate((yy) => scrollTo(0, yy), y); await new Promise((r) => setTimeout(r, 1300));
  await p.mouse.move(400 + k * 160, 300 + (k % 2) * 220); await new Promise((r) => setTimeout(r, 500));
  await sharp(await p.screenshot({ type: "png" })).jpeg({ quality: 84 }).toFile(at(`built-${k}.jpg`)); frames.push(y);
}
data.builtFrames = frames.length; save();
await b.close();
log("done", JSON.stringify({ leaders: data.leaders.map((l) => l.name), looks: data.directions.map((x) => `${x.group === "market" ? "take on " + x.ref : "alt"}: ${x.name}`), frames: frames.length }));
