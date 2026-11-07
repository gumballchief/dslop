"use client";
// The whole Unslop flow in one place: start (link or description) -> read -> tells + three directions -> live build -> chat edits -> publish -> cancel Lovable.
import { useEffect, useMemo, useRef, useState } from "react";
import type { Analysis, Direction } from "@/lib/claude";
import Story, { Gallery } from "./Story";
import { BRAND } from "@/lib/brand";

type Signal = { id: string; label: string; evidence: string; severity: "loud" | "quiet" };
type ScanLite = { url: string; title: string; builtWith: string | null; images: string[]; fonts: string[]; colors: string[]; signals: Signal[]; frameable?: boolean } | null;
type Stage = "home" | "reading" | "pick" | "building" | "ready";
type Msg = { who: "you" | "unslop"; text: string };
type Mode = "link" | "shot" | "describe";
/** one direction's real first screen: drawn by /api/mock, shaped in chat, then built into the full page */
type MockState = { html: string; shown: string; status: "drawing" | "ready" | "error"; error?: string; chat: Msg[]; asks: string[] };

/** reads a newline-JSON stream from /api/mock or /api/build */
async function readNdjson(res: Response, on: (ev: { t: string; d?: string }) => void) {
  if (!res.ok || !res.body) { const data = await res.json().catch(() => ({})); throw new Error(data.error ?? "That didn't start"); }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
      if (!line.trim()) continue;
      const ev = JSON.parse(line);
      if (ev.t === "error") throw new Error(ev.m);
      on(ev);
    }
  }
}
const cleanHtml = (s: string) => s.replace(/^```html\s*/i, "").replace(/```\s*$/, "").trim();
const SHAPE_CHIPS = ["Make it darker", "Try a different font pairing", "Bigger, bolder headline", "Swap the main color", "Add a pricing section"];

/** reads a picked image and shrinks it to at most 1600 px wide, as a JPEG data URL (keeps uploads small) */
function readShot(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1600 / img.width);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(Math.min(img.height * scale, 4000));
      c.getContext("2d")!.drawImage(img, 0, 0, img.width * scale, img.height * scale);
      resolve(c.toDataURL("image/jpeg", 0.85));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error("That file isn't an image we can read"));
    img.src = URL.createObjectURL(file);
  });
}

const SAMPLE = "/samples/relay.html";

function useGoogleFonts(families: string[]) {
  useEffect(() => {
    const uniq = [...new Set(families.filter(Boolean))];
    if (!uniq.length) return;
    const href = `https://fonts.googleapis.com/css2?${uniq.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;500;700;800`).join("&")}&display=swap`;
    if (document.querySelector(`link[href="${href}"]`)) return;
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    document.head.appendChild(l);
  }, [families.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
}

export default function Unslop() {
  const [stage, setStage] = useState<Stage>("home");
  const [mode, setMode] = useState<Mode>("link");
  const [shot, setShot] = useState(""); // an uploaded screenshot, as a downscaled JPEG data URL
  const [beforeImg, setBeforeImg] = useState("");
  const [serverShot, setServerShot] = useState(""); // the top of the page, captured while reading it
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [scan, setScan] = useState<ScanLite>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [direction, setDirection] = useState<Direction | null>(null);
  const [html, setHtml] = useState("");
  const [notes, setNotes] = useState("");
  const [view, setView] = useState<"after" | "before">("after");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [ask, setAsk] = useState("");
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState<{ id: string; path: string } | null>(null);
  const [shown, setShown] = useState(""); // the HTML currently in the preview frame (throttled during the build)
  const lastPaint = useRef(0);
  const [mocks, setMocks] = useState<MockState[]>([]);
  const [focus, setFocus] = useState<number | null>(null); // the direction opened big, to shape in chat
  const mockRun = useRef<{ gen: number; aborts: AbortController[] }>({ gen: 0, aborts: [] });

  // draws one direction's first screen, streaming it into its card
  async function drawOne(a: Analysis, images: string[], i: number) {
    const gen = mockRun.current.gen;
    const ctrl = new AbortController();
    mockRun.current.aborts[i] = ctrl;
    const patch = (p: Partial<MockState>) => { if (mockRun.current.gen === gen) setMocks((ms) => ms.map((m, k) => (k === i ? { ...m, ...p } : m))); };
    patch({ html: "", shown: "", status: "drawing", error: undefined });
    let page = "", last = 0;
    try {
      const res = await fetch("/api/mock", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ analysis: a, direction: a.directions[i], images }), signal: ctrl.signal });
      await readNdjson(res, (ev) => {
        if (ev.t !== "html") return;
        page += ev.d ?? "";
        const now = Date.now();
        const b = page.search(/<body/i);
        if (b >= 0 && page.length - b > 700 && now - last > 1200) { last = now; patch({ shown: page }); } // wait for some body before showing it
      });
      const done = cleanHtml(page);
      patch({ html: done, shown: done, status: "ready" });
    } catch (err) {
      if (ctrl.signal.aborted) return;
      patch({ status: "error", error: err instanceof Error ? err.message : "Couldn't draw this one" });
    }
  }
  function stopMocks() {
    mockRun.current.aborts.forEach((c) => c?.abort());
    mockRun.current = { gen: mockRun.current.gen + 1, aborts: [] };
  }
  function drawMocks(a: Analysis, images: string[]) {
    stopMocks();
    setFocus(null);
    setMocks(a.directions.map(() => ({ html: "", shown: "", status: "drawing", chat: [], asks: [] })));
    a.directions.forEach((_, i) => { drawOne(a, images, i); });
  }
  const patchMock = (i: number, p: Partial<MockState> | ((m: MockState) => Partial<MockState>)) =>
    setMocks((ms) => ms.map((m, k) => (k === i ? { ...m, ...(typeof p === "function" ? p(m) : p) } : m)));

  useGoogleFonts(analysis?.directions.flatMap((d) => [d.fonts.display, d.fonts.body]) ?? []);

  // paint the streaming page into the preview at most every ~1.8 s, once there is a body to show
  useEffect(() => {
    if (stage !== "building") { setShown(html); return; }
    if (!/<body/i.test(html)) return;
    const now = Date.now();
    if (now - lastPaint.current > 1800) { lastPaint.current = now; setShown(html); }
  }, [html, stage]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function start(e?: React.FormEvent, override?: string) {
    e?.preventDefault();
    const value = (override ?? input).trim();
    const useShot = !override && mode === "shot";
    if (useShot && !shot) { setError("Pick a screenshot of the site first"); return; }
    if (!useShot && !value) { setError(mode === "link" ? "Paste a link first" : "Describe the site first"); return; }
    stopMocks(); setMocks([]); setFocus(null);
    setError(""); setStage("reading"); setAnalysis(null); setScan(null); setDirection(null); setHtml(""); setNotes(""); setMsgs([]); setPublished(null); setBeforeImg(useShot ? shot : ""); setServerShot("");
    try {
      const body = useShot ? { image: shot, url: /^\S+\.\S+$/.test(value) ? value : undefined } : override || mode === "link" ? { url: value.startsWith("/") ? origin + value : value } : { brief: value };
      const res = await fetch("/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "blocked") { setMode("shot"); }
        throw new Error(data.error ?? "Couldn't read that");
      }
      setScan(data.scan); setServerShot(data.shot ?? ""); setAnalysis(data.analysis); setStage("pick"); setView(data.scan || useShot ? "before" : "after");
      drawMocks(data.analysis, data.scan?.images ?? []); // the three first screens start drawing right away
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong"); setStage("home");
    }
  }

  // builds the full page; from a shaped first screen when there is one (it keeps that screen and the asked-for changes)
  async function build(d: Direction, from?: MockState) {
    if (!analysis) return;
    const mock = from?.status === "ready" ? from : undefined;
    setDirection(d); setStage("building"); setHtml(""); setShown(mock?.html ?? ""); setNotes(""); setView("after"); setPublished(null); setError(""); lastPaint.current = Date.now();
    setMsgs([...(mock?.chat ?? []), { who: "unslop", text: mock ? `Building the full ${d.name} site from this first screen${mock.asks.length ? ", with your changes all the way down" : ""}.` : `Building it in ${d.name}. ${d.world}` }]);
    let page = "";
    try {
      const res = await fetch("/api/build", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ analysis, direction: d, images: scan?.images ?? [], mock: mock?.html, asks: mock?.asks }) });
      await readNdjson(res, (ev) => {
        if (ev.t === "think") setNotes((n) => (n + (ev.d ?? "")).slice(-1800));
        else if (ev.t === "html") { page += ev.d ?? ""; setHtml(page); }
      });
      const clean = cleanHtml(page);
      setHtml(clean); setShown(clean); setStage("ready");
      setMsgs((m) => [...m, { who: "unslop", text: "Done. Ask for any change, or publish it." }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The build failed");
      if (page) { setHtml(cleanHtml(page)); setShown(cleanHtml(page)); setStage("ready"); } else setStage("pick");
    }
  }

  // a chat change to the first screen that's open big (before the full build)
  async function shapeMock(i: number, q: string) {
    const m = mocks[i];
    if (!m || m.status !== "ready" || !analysis) return;
    setBusy(true);
    patchMock(i, (x) => ({ chat: [...x.chat, { who: "you", text: q }] }));
    try {
      const res = await fetch("/api/edit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ html: m.html, ask: q, direction: analysis.directions[i] }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "That change failed");
      patchMock(i, (x) => ({ html: data.html, shown: data.html, asks: [...x.asks, q], chat: [...x.chat, { who: "unslop", text: data.reply + (data.missed ? ` (${data.missed} part${data.missed > 1 ? "s" : ""} didn't apply, ask again if something's missing.)` : "") }] }));
    } catch (err) {
      patchMock(i, (x) => ({ chat: [...x.chat, { who: "unslop", text: err instanceof Error ? err.message : "That change failed" }] }));
    } finally { setBusy(false); }
  }

  async function edit(e?: React.FormEvent, chip?: string) {
    e?.preventDefault();
    const q = (chip ?? ask).trim();
    if (!q || busy) return;
    setAsk("");
    if (stage === "pick" && focus !== null) { await shapeMock(focus, q); return; }
    setBusy(true); setMsgs((m) => [...m, { who: "you", text: q }]);
    try {
      const res = await fetch("/api/edit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ html, ask: q, direction }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "That edit failed");
      setHtml(data.html); setShown(data.html);
      setMsgs((m) => [...m, { who: "unslop", text: data.reply + (data.missed ? ` (${data.missed} part${data.missed > 1 ? "s" : ""} didn't apply, ask again if something's missing.)` : "") }]);
    } catch (err) {
      setMsgs((m) => [...m, { who: "unslop", text: err instanceof Error ? err.message : "That edit failed" }]);
    } finally { setBusy(false); }
  }

  async function publish() {
    if (!html || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/publish", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ html, name: analysis?.site.name, id: published?.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Publishing failed");
      setPublished(data);
    } catch (err) {
      setMsgs((m) => [...m, { who: "unslop", text: err instanceof Error ? err.message : "Publishing failed" }]);
    } finally { setBusy(false); }
  }

  function download() {
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(analysis?.site.name ?? "site").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const lines = useMemo(() => html.split("\n").length, [html]);

  if (stage === "home") return <Home mode={mode} setMode={(m) => { setMode(m); setError(""); }} input={input} setInput={setInput} shot={shot} setShot={setShot} setError={setError} error={error} onStart={start} onSample={() => { setMode("link"); setInput(origin + SAMPLE); start(undefined, SAMPLE); }} />;

  const hasBefore = Boolean(scan || beforeImg);
  const grade = analysis ? gradeOf(analysis.score) : null;
  const beforeView = beforeImg ? <img src={beforeImg} alt="Your screenshot of the site" /> : scan ? <Before url={scan.url} alt={`The current ${analysis?.site.name ?? ""} site`} fallback={serverShot} frameable={scan.frameable !== false} /> : null;
  const shaping = stage === "pick" && focus !== null && mocks[focus] ? mocks[focus] : null;
  const chatMsgs = shaping ? shaping.chat : msgs;

  return (
    <main className="studio">
      <div className="world" aria-hidden />
      <div className="window">
        <header className="bar">
          <button className="wordmark" onClick={() => { stopMocks(); setStage("home"); }} aria-label={`${BRAND.name} home`}>{BRAND.logo ? <img src={BRAND.logo} alt={BRAND.name} className="logoimg" /> : BRAND.mark}</button>
          <span className="chip mono">{scan ? scan.url.replace(/^https?:\/\//, "").replace(/\/$/, "") : beforeImg ? "your screenshot" : "new site"}</span>
          {analysis && grade && hasBefore && <span className={`chip score ${grade.tone}`}>{analysis.score}% slop{scan?.builtWith ? `, made with ${scan.builtWith}` : ""}</span>}
          <span className="grow" />
          {html && stage === "ready" && <button className="ghost" onClick={download}>Download code</button>}
          {html && stage === "ready" && <button className="primary" onClick={publish} disabled={busy}>{published ? "Publish again" : "Publish"}</button>}
        </header>

        <aside className="side">
          {stage === "reading" && (
            <div className="steps">
              <h2>Reading {beforeImg ? "your screenshot" : mode === "link" ? "your site" : "your idea"}</h2>
              {[beforeImg ? "Reading every word in it" : mode === "link" ? "Opening the page" : "Pulling out the facts", "Checking it against the slop list", "Keeping every real fact", "Picking three art directions"].map((s, i) => <p key={s} className="step" style={{ animationDelay: `${i * 1.6}s` }}>{s}</p>)}
            </div>
          )}

          {published && (
            <section className="done">
              <h3>It's live</h3>
              <a className="live mono" href={published.path} target="_blank" rel="noreferrer">{origin.replace(/^https?:\/\//, "")}{published.path}</a>
              <div className="cancel">
                <p className="big">Now cancel Lovable.</p>
                <p>You just did what Lovable Pro charges <b>$25 a month</b> for. That's <b>$300 a year</b> back.</p>
                <a className="primary" href="https://lovable.dev/settings" target="_blank" rel="noreferrer">Open Lovable billing</a>
              </div>
            </section>
          )}
          {(stage === "building" || stage === "ready" || shaping) && (
            <section className="chat">
              <h3>{stage === "building" ? "Building live" : shaping ? `Shape ${analysis?.directions[focus!].name ?? "it"}` : "Change anything"}</h3>
              {shaping && chatMsgs.length === 0 && <p className="muted">Change anything before the full build: colors, fonts, the headline, the layout, whole components. Everything you ask for carries into the full site.</p>}
              <div className="msgs">
                {chatMsgs.map((m, i) => <p key={i} className={m.who}>{m.text}</p>)}
                {busy && shaping && <p className="notes">Changing it...</p>}
                {stage === "building" && <p className="notes">{notes ? notes.slice(-420) : "Laying out the world first..."}</p>}
                {stage === "building" && <p className="progress mono">{lines} lines written</p>}
              </div>
              {(stage === "ready" || shaping) && (
                <>
                  {shaping && shaping.status === "ready" && <div className="askchips">{SHAPE_CHIPS.map((c) => <button key={c} type="button" onClick={() => edit(undefined, c)} disabled={busy}>{c}</button>)}</div>}
                  <form onSubmit={edit} className="ask">
                    <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder={shaping ? (shaping.status === "ready" ? "Make the background navy, use a serif, add a menu..." : "Wait for it to finish drawing...") : "Make the hero bigger, swap the CTA, add pricing..."} aria-label="Ask for a change" disabled={!!shaping && shaping.status !== "ready"} />
                    <button className="primary" disabled={busy || !ask.trim() || (!!shaping && shaping.status !== "ready")}>{busy ? "..." : "Send"}</button>
                  </form>
                </>
              )}
            </section>
          )}

          {analysis && stage !== "reading" && (
            <>
              <section className="verdict">
                <h2>{analysis.site.name}</h2>
                <p className="muted">{analysis.site.oneLiner}</p>
                {hasBefore && grade && <p className={`grade ${grade.tone}`}><b>{grade.label}</b><span>{grade.line}</span></p>}
                {hasBefore && <p className="verdictline">{analysis.verdict}</p>}
              </section>
              {hasBefore && analysis.strengths.length > 0 && stage === "pick" && (
                <section>
                  <h3>What already works</h3>
                  <ul className="strengths">{analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </section>
              )}
              {hasBefore && analysis.tells.length === 0 && stage === "pick" && (
                <p className="muted">Nothing on this page reads as AI-made. The directions below are fresh takes if you want one, not fixes.</p>
              )}
              {analysis.tells.length > 0 && (
                <section>
                  <h3>{hasBefore ? (analysis.score < 40 ? "Small things we'd still change" : "What makes it look AI-made") : "The slop we'll keep out"}</h3>
                  {(stage === "building" || stage === "ready") ? <div className="tellchips">{analysis.tells.map((t, i) => <span key={i} className={t.severity}>{t.label}</span>)}</div> : <ul className="tells">
                    {analysis.tells.map((t, i) => (
                      <li key={i} className={t.severity}>
                        <b>{t.label}</b>
                        <span>{t.evidence}</span>
                        <em>Fix: {t.fix}</em>
                      </li>
                    ))}
                  </ul>}
                </section>
              )}
            </>
          )}

          {error && <p className="error">{error}</p>}
        </aside>

        <section className="canvas">
          {stage === "pick" && analysis && view === "after" && focus === null && (
            <div className="directions">
              <h2>Three real directions</h2>
              <p className="dlede">Each one is the actual first screen, drawn for {analysis.site.name}. Open one to look closer and change anything, then build it.</p>
              <div className="mocks">
                {analysis.directions.map((d, i) => <MockCard key={i} d={d} m={mocks[i]} onOpen={() => setFocus(i)} onRetry={() => drawOne(analysis, scan?.images ?? [], i)} />)}
              </div>
            </div>
          )}
          {stage === "pick" && analysis && view === "after" && focus !== null && mocks[focus] && (
            <div className="shape">
              <div className="shapebar">
                <button className="ghost" onClick={() => setFocus(null)}>All three</button>
                <span className="shapename"><b>{analysis.directions[focus].name}</b><span className="mono">{analysis.directions[focus].fonts.display} + {analysis.directions[focus].fonts.body}</span></span>
                <span className="grow" />
                <button className="primary" onClick={() => build(analysis.directions[focus], mocks[focus])} disabled={busy}>Build the full site</button>
              </div>
              <div className="shapeview">
                {mocks[focus].shown ? <MockFrame html={mocks[focus].shown} title={`${analysis.directions[focus].name}, first screen`} tall /> : <div className="blank"><p>Drawing the first screen...</p></div>}
                {mocks[focus].status === "drawing" && <span className="drawing mono">drawing it live</span>}
                {mocks[focus].status === "error" && <div className="blank"><p>{mocks[focus].error}</p><button className="ghost" onClick={() => drawOne(analysis, scan?.images ?? [], focus)}>Draw it again</button></div>}
              </div>
            </div>
          )}
          {stage === "pick" && view === "before" && hasBefore && (
            <div className="before">
              {beforeView}
              <div className="beforeTags">
                {analysis && analysis.tells.length === 0 ? <span className="clean">No AI tells found</span> : analysis?.tells.slice(0, 6).map((t, i) => <span key={i} className={t.severity}>{t.label}</span>)}
              </div>
              <button className="primary floating" onClick={() => setView("after")}>See three directions</button>
            </div>
          )}
          {stage === "reading" && (
            <div className="before reading">
              {beforeImg ? <img src={beforeImg} alt="" /> : mode === "link" && input && <Before url={input.startsWith("/") ? origin + input : input} alt="" />}
              <i className="scanline" />
            </div>
          )}
          {(stage === "building" || stage === "ready") && (
            <div className="preview">
              {hasBefore && <div className="toggle"><button className={view === "before" ? "on" : ""} onClick={() => setView("before")}>Before</button><button className={view === "after" ? "on" : ""} onClick={() => setView("after")}>After</button></div>}
              {view === "after" ? (shown ? <iframe title="The unslopped site" srcDoc={shown} sandbox="allow-scripts allow-same-origin" /> : <div className="blank"><p>The world goes in first, then the words.</p></div>) : <div className="before">{beforeView}</div>}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/* the score in plain words, on the same rubric Claude is given (lib/claude.ts) */
function gradeOf(score: number): { label: string; line: string; tone: "good" | "meh" | "bad" } {
  if (score < 20) return { label: "Not slop", line: "This one was made with care.", tone: "good" };
  if (score < 40) return { label: "Mostly crafted", line: "A real identity with a habit or two.", tone: "good" };
  if (score < 70) return { label: "Template-ish", line: "Real content in a generic shell.", tone: "meh" };
  return { label: "AI template", line: "It looks like every other AI-made site.", tone: "bad" };
}

/* the site as it is now: a full-page screenshot (Microlink), or the live page itself when a screenshot can't be taken */
// Fallbacks in order: full-page screenshot -> the top-of-page shot taken while reading -> the live page in a frame
// (only if the site allows framing) -> a plain card that links out. Never a blank white box.
function Before({ url, alt, fallback = "", frameable = true }: { url: string; alt: string; fallback?: string; frameable?: boolean }) {
  const [failed, setFailed] = useState(false);
  const local = url.startsWith("http://localhost") || url.startsWith("http://127.");
  if (local) return <iframe className="beforeFrame" title={alt || "The site as it is now"} src={url} sandbox="allow-scripts allow-same-origin" />;
  if (!failed) {
    const shot = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url&viewport.width=1440&viewport.height=900&screenshot.fullPage=true`;
    return <img src={shot} alt={alt} onError={() => setFailed(true)} />;
  }
  if (fallback) return <img src={fallback} alt={alt} />;
  if (frameable) return <iframe className="beforeFrame" title={alt || "The site as it is now"} src={url} sandbox="allow-scripts allow-same-origin" />;
  return (
    <div className="nopreview">
      <p>This site doesn't allow previews inside other pages, so there's no picture of it here.</p>
      <a className="ghost" href={url} target="_blank" rel="noreferrer">Open {url.replace(/^https?:\/\//, "").replace(/\/$/, "")} in a new tab</a>
    </div>
  );
}

/* a 1440-wide page shown at the width of its box (the preview is a real page, scaled, never re-laid out) */
function MockFrame({ html, title, tall }: { html: string; title: string; tall?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // two frames: a new version loads in the hidden one and only then swaps in, so a change never flashes white
  const [slots, setSlots] = useState<[string, string]>([html, ""]);
  const [vis, setVis] = useState(0);
  useEffect(() => {
    if (html === slots[vis]) return;
    setSlots((sl) => { const n: [string, string] = [sl[0], sl[1]]; n[1 - vis] = html; return n; });
  }, [html]); // eslint-disable-line react-hooks/exhaustive-deps
  const s = box.w / 1440;
  return (
    <div ref={ref} className={`mockframe${tall ? " tall" : ""}`}>
      {s > 0 && slots.map((doc, i) => doc && (
        <iframe key={i} title={i === vis ? title : `${title} (loading)`} srcDoc={doc} sandbox="" tabIndex={tall && i === vis ? 0 : -1} aria-hidden={i !== vis}
          onLoad={() => { if (i !== vis && doc === html) setVis(i); }}
          style={{ width: 1440, height: tall ? Math.max(900, box.h / s) : 900, transform: `scale(${s})`, opacity: i === vis ? 1 : 0, zIndex: i === vis ? 1 : 0 }} />
      ))}
    </div>
  );
}

/* one direction: its real first screen (streaming in), or the direction card while it draws */
function MockCard({ d, m, onOpen, onRetry }: { d: Direction; m?: MockState; onOpen: () => void; onRetry: () => void }) {
  const p = d.palette;
  return (
    <div className="mock">
      <div className="mockshot" role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }} aria-label={`Open ${d.name}`} style={{ background: p.ground, color: p.ink }}>
        {m?.shown ? <MockFrame html={m.shown} title={`${d.name}, first screen`} /> : (
          <span className="mockwait">
            <span className="dhead" style={{ fontFamily: `'${d.fonts.display}', serif` }}>{d.headline}</span>
            <span className="dcta" style={{ background: p.accent, color: d.dark ? p.ground : "#fff", fontFamily: `'${d.fonts.body}', sans-serif` }}>{d.cta}</span>
          </span>
        )}
        {m?.status === "drawing" && <span className="drawing mono">{m.shown ? "drawing it live" : "drawing the first screen"}</span>}
      </div>
      <div className="mockinfo">
        <b>{d.name}</b>
        <span>{d.why}</span>
        <span className="mockmeta"><span className="dswatches">{[p.ground, p.surface, p.ink, p.accent, p.accent2].map((c, i) => <i key={i} style={{ background: c }} />)}</span><span className="dfonts mono">{d.fonts.display} + {d.fonts.body}</span></span>
        {m?.status === "error" ? <span className="mockerr">{m.error} <button className="ghost" onClick={onRetry}>Draw it again</button></span> : <button className="ghost" onClick={onOpen}>Open and shape it</button>}
      </div>
    </div>
  );
}

function Home({ mode, setMode, input, setInput, shot, setShot, setError, error, onStart, onSample }: { mode: Mode; setMode: (m: Mode) => void; input: string; setInput: (s: string) => void; shot: string; setShot: (s: string) => void; setError: (s: string) => void; error: string; onStart: (e?: React.FormEvent) => void; onSample: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  async function take(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("That file isn't an image. Use a PNG or JPG screenshot."); return; }
    try { setShot(await readShot(file)); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Couldn't read that image"); }
  }
  return (
    <main className="home">
      <div className="world" aria-hidden />
      <section className="hero">
        <p className="brand">{BRAND.logo ? <img src={BRAND.logo} alt={BRAND.name} className="logoimg big" /> : BRAND.mark}</p>
        <h1>Your site, <span>{BRAND.past}</span></h1>
        <p className="lede">Paste any site or drop a screenshot. We circle what makes it look AI-made, give you three real art directions, and rebuild it live. Publish it here, and cancel Lovable.</p>
        <form className="start" onSubmit={onStart}>
          <div className="modes" role="tablist">
            <button type="button" role="tab" aria-selected={mode === "link"} className={mode === "link" ? "on" : ""} onClick={() => setMode("link")}>Paste a link</button>
            <button type="button" role="tab" aria-selected={mode === "shot"} className={mode === "shot" ? "on" : ""} onClick={() => setMode("shot")}>Upload a screenshot</button>
            <button type="button" role="tab" aria-selected={mode === "describe"} className={mode === "describe" ? "on" : ""} onClick={() => setMode("describe")}>Describe a new site</button>
          </div>
          <div className="field">
            {mode === "link" && <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="yoursite.lovable.app" aria-label="Your site's link" />}
            {mode === "describe" && <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="A landing page for my coffee roastery on the pier in Santa Cruz. Small batches, walk-up window open 7 to 2." aria-label="Describe your site" rows={3} />}
            {mode === "shot" && (
              <div
                className={`drop${dragging ? " over" : ""}${shot ? " has" : ""}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); take(e.dataTransfer.files[0]); }}
                onPaste={(e) => take(e.clipboardData.files[0])}
                role="button" tabIndex={0} aria-label="Choose a screenshot of your site"
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
              >
                {shot ? <img src={shot} alt="Your screenshot" /> : null}
                <span>{shot ? "Screenshot ready. Click to swap it." : "Drop a full-page screenshot here, paste one, or click to choose"}</span>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => take(e.target.files?.[0])} />
              </div>
            )}
            <button className="primary big" type="submit">{BRAND.cta}</button>
          </div>
          {error && <p className="error">{error}</p>}
          <button type="button" className="sample" onClick={onSample}>No site handy? Try a typical AI-made one</button>
        </form>
      </section>

      <Story />
      <Gallery />

      <section className="band swap">
        <div>
          <h2>Stop paying for slop.</h2>
          <p>Lovable Pro is $25 a month, and its sites all look the same. {BRAND.name} is free while it's new, and every site gets its own world.</p>
        </div>
        <div className="bill">
          <p className="row"><span>Lovable Pro</span><s>$25 / month</s></p>
          <p className="row"><span>{BRAND.name}</span><b>$0</b></p>
          <p className="row total"><span>Back in your pocket</span><b>$300 a year</b></p>
        </div>
      </section>

      <section className="band tellsband">
        <h2>What we circle</h2>
        <div className="chips">
          {["Purple gradient", "Em dashes", "Elevate, seamless, unleash", "Eyebrow labels", "Three same cards", "Default font", "Glow and glass", "Get Started + Learn More", "Fake numbers"].map((t) => <span key={t}>{t}</span>)}
        </div>
        <p>Every tell comes with the evidence from your page and the fix. Then it rebuilds the whole thing in a look that could only be yours.</p>
      </section>

      <footer className="foot"><span className="brand">{BRAND.logo ? <img src={BRAND.logo} alt={BRAND.name} className="logoimg" /> : BRAND.mark}</span><span>Built at Ship Happens, San Francisco</span></footer>
    </main>
  );
}
