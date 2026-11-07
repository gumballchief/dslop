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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong"); setStage("home");
    }
  }

  async function build(d: Direction) {
    if (!analysis) return;
    setDirection(d); setStage("building"); setHtml(""); setShown(""); setNotes(""); setView("after"); setPublished(null); lastPaint.current = 0;
    setMsgs([{ who: "unslop", text: `Building it in ${d.name}. ${d.world}` }]);
    try {
      const res = await fetch("/api/build", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ analysis, direction: d, images: scan?.images ?? [] }) });
      if (!res.ok || !res.body) { const data = await res.json().catch(() => ({})); throw new Error(data.error ?? "The build didn't start"); }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
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
          if (ev.t === "think") setNotes((n) => (n + ev.d).slice(-1800));
          else if (ev.t === "html") { page += ev.d; setHtml(page); }
          else if (ev.t === "error") throw new Error(ev.m);
        }
      }
      const clean = page.replace(/^```html\s*/i, "").replace(/```\s*$/, "").trim();
      setHtml(clean); setShown(clean); setStage("ready");
      setMsgs((m) => [...m, { who: "unslop", text: "Done. Ask for any change, or publish it." }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The build failed"); setStage(html ? "ready" : "pick");
    }
  }

  async function edit(e: React.FormEvent) {
    e.preventDefault();
    const q = ask.trim();
    if (!q || busy) return;
    setAsk(""); setBusy(true); setMsgs((m) => [...m, { who: "you", text: q }]);
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

  return (
    <main className="studio">
      <div className="world" aria-hidden />
      <div className="window">
        <header className="bar">
          <button className="wordmark" onClick={() => setStage("home")} aria-label={`${BRAND.name} home`}>{BRAND.logo ? <img src={BRAND.logo} alt={BRAND.name} className="logoimg" /> : BRAND.mark}</button>
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
          {(stage === "building" || stage === "ready") && (
            <section className="chat">
              <h3>{stage === "building" ? "Building live" : "Change anything"}</h3>
              <div className="msgs">
                {msgs.map((m, i) => <p key={i} className={m.who}>{m.text}</p>)}
                {stage === "building" && <p className="notes">{notes ? notes.slice(-420) : "Laying out the world first..."}</p>}
                {stage === "building" && <p className="progress mono">{lines} lines written</p>}
              </div>
              {stage === "ready" && (
                <form onSubmit={edit} className="ask">
                  <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Make the hero bigger, swap the CTA, add pricing..." aria-label="Ask for a change" />
                  <button className="primary" disabled={busy || !ask.trim()}>{busy ? "..." : "Send"}</button>
                </form>
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
          {stage === "pick" && analysis && view === "after" && (
            <div className="directions">
              <h2>Pick a direction</h2>
              <div className="cards">
                {analysis.directions.map((d, i) => <DirectionCard key={i} d={d} onPick={() => build(d)} />)}
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

function DirectionCard({ d, onPick }: { d: Direction; onPick: () => void }) {
  const p = d.palette;
  return (
    <button className="dcard" onClick={onPick} style={{ background: p.ground, color: p.ink }}>
      <span className="dname" style={{ fontFamily: `'${d.fonts.body}', sans-serif` }}>{d.name}</span>
      <span className="dhead" style={{ fontFamily: `'${d.fonts.display}', serif` }}>{d.headline}</span>
      <span className="dsub" style={{ fontFamily: `'${d.fonts.body}', sans-serif` }}>{d.subline}</span>
      <span className="dcta" style={{ background: p.accent, color: d.dark ? p.ground : "#fff", fontFamily: `'${d.fonts.body}', sans-serif` }}>{d.cta}</span>
      <span className="dworld" style={{ fontFamily: `'${d.fonts.body}', sans-serif` }}>{d.world}</span>
      <span className="dswatches">{[p.ground, p.surface, p.ink, p.accent, p.accent2].map((c, i) => <i key={i} style={{ background: c }} />)}</span>
      <span className="dfonts mono">{d.fonts.display} + {d.fonts.body}</span>
    </button>
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
