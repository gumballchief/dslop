// End-to-end check of the pick step: sample site -> tells -> six directions (with the market study) -> previews ->
// the chat ("sup", then a change). Screens go to research/flow-*.jpg.
//   node flowtest.mjs [app=http://localhost:3090] [site=sample|<url>]
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { CHROME } from "./chrome.mjs";
const arg = (k, d) => (process.argv.find((a) => a.startsWith(k + "=")) ?? "").slice(k.length + 1) || d;
const APP = arg("app", "http://localhost:3090"), SITE = arg("site", "sample");
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--hide-scrollbars"] });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900 });
const t0 = Date.now();
const at = () => `${Math.round((Date.now() - t0) / 1000)}s`;
const RUN = arg("run", "a");
const snap = async (name) => { await sharp(await p.screenshot({ type: "png" })).resize(1200).jpeg({ quality: 80 }).toFile(`flow-${RUN}-${name}.jpg`); console.log(at(), "snap", name); };
const clickText = async (text) => { const ok = await p.evaluate((t) => { const el = [...document.querySelectorAll("button, a")].find((e) => e.textContent.trim() === t); if (el) el.click(); return !!el; }, text); if (!ok) throw new Error("no button: " + text); };
const waitFor = async (fn, ms, label) => { const end = Date.now() + ms; while (Date.now() < end) { if (await p.evaluate(fn)) return; await new Promise((r) => setTimeout(r, 1000)); } throw new Error("timed out waiting for " + label); };

await p.goto(APP, { waitUntil: "networkidle2" });
if (SITE === "sample") await clickText("No site handy? Try a typical AI-made one");
else { await p.type('input[aria-label="Your site\'s link"]', SITE); await clickText("DSlop it"); }
await waitFor(() => [...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "See six directions"), 150000, "the read");
console.log(at(), "read done");
await clickText("See six directions");
await new Promise((r) => setTimeout(r, 1500));
await snap("1-studying");
await waitFor(() => document.querySelectorAll(".mock .mockinfo .mocktag").length === 6, 150000, "six directions");
console.log(at(), "six directions:", await p.evaluate(() => [...document.querySelectorAll(".mock .mockinfo")].map((m) => `${m.querySelector(".mocktag").textContent} | ${m.querySelector("b").textContent}`).join(" || ")));
console.log("   leaders:", await p.evaluate(() => [...document.querySelectorAll(".leader")].map((l) => `${l.querySelector("b").textContent}${l.querySelector("img") ? " (seen)" : " (not opened)"}`).join(", ")));
await waitFor(() => document.querySelectorAll(".mock .drawing").length === 0 && document.querySelectorAll(".mock iframe").length >= 6, 150000, "the six previews");
await new Promise((r) => setTimeout(r, 2500));
console.log(at(), "previews drawn");
await snap("2-six");
await p.evaluate(() => document.querySelector(".directions").scrollTo(0, 99999));
await new Promise((r) => setTimeout(r, 800));
await snap("3-six-bottom");
// chat: hello, then a change
const say = async (text) => {
  const before = await p.evaluate(() => document.querySelectorAll(".chat.talk .msgs p:not(.notes)").length);
  await p.type('input[aria-label="Talk to DSlop"]', text);
  await p.keyboard.press("Enter");
  await waitFor(new Function(`return document.querySelectorAll(".chat.talk .msgs p:not(.notes)").length >= ${before + 2}`), 120000, "a reply");
  console.log(at(), "you:", text, "| DSlop:", await p.evaluate(() => [...document.querySelectorAll(".chat.talk .msgs p:not(.notes)")].pop().textContent));
};
const fxCount = await p.evaluate(() => [...document.querySelectorAll(".mock iframe")].filter((f) => /fx.js/.test(f.srcdoc)).length);
console.log("   previews using the motion engine:", fxCount, "of", await p.evaluate(() => document.querySelectorAll(".mock iframe").length));
if (arg("chat", "")) { await say("It is for developers, keep it calm"); }
await new Promise((r) => setTimeout(r, 4000));
await waitFor(() => document.querySelectorAll(".mock .drawing").length === 0, 120000, "the redraw");
await new Promise((r) => setTimeout(r, 2500));
await p.evaluate(() => document.querySelector(".directions").scrollTo(0, 0));
await snap("4-after-chat");
await b.close();
