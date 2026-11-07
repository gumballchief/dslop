"use client";
// The scroll-through: one pinned stage that plays the whole unslop process as you scroll.
// Everything in it is real output from the product (the Relay sample, its real tells and directions, the real build,
// the real reply to a slop request, the real published link). Relay itself is a made-up sample company.
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import data from "@/lib/story-data.json";

const IMG_W = 1440, IMG_H = 1500;
// where each tell sits on the sample page (measured from the live sample at 1440 wide)
const MARKS: { box: [number, number, number, number]; label: string }[] = [
  { box: [0, 84, 1440, 630], label: "Purple to pink gradient" },
  { box: [591, 204, 258, 29], label: "Eyebrow label" },
  { box: [270, 255, 900, 134], label: "Supercharge, seamless" },
  { box: [400, 411, 640, 75], label: "Em dash, filler verbs" },
  { box: [562, 518, 316, 60], label: "Get Started + Learn More" },
  { box: [194, 953, 1052, 259], label: "Three emoji cards" },
];
const SAY = [
  { h: "This is what an AI builder gave Relay.", p: "Purple gradient, filler words, three emoji cards. You have seen this page a thousand times." },
  { h: "It circles every tell.", p: "Each one with the evidence from the page and the fix. Relay scores 94% slop." },
  { h: "Then it picks three directions.", p: "Chosen for this kind of site from a taste library built by studying about 95 of the best landing pages. They never look alike." },
  { h: "It rebuilds live.", p: "About 35 seconds, every real fact kept. You watch it write the page." },
  { h: "Ask for anything. Except slop.", p: "Ask for a purple glow and it says no out loud, then does something better." },
  { h: "Publish. Then cancel Lovable.", p: "A live link and the code are yours. That's $300 a year back." },
];
const pct = (v: number, of: number) => `${(v / of) * 100}%`;

export default function Story() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root);
      const says = q(".say");
      gsap.set(says, { autoAlpha: 0, y: 40 });
      gsap.set(says[0], { autoAlpha: 1, y: 0 });
      gsap.set(q(".mark"), { autoAlpha: 0, scale: 1.08 });
      gsap.set(q(".dir"), { autoAlpha: 0, y: 420, rotate: (i) => (i - 1) * 10 });
      gsap.set(q(".built"), { clipPath: "inset(0 0 100% 0)" });
      gsap.set(q(".bubble"), { autoAlpha: 0, y: 30 });
      gsap.set(q(".shipped > *"), { autoAlpha: 0, y: 60 });

      const tl = gsap.timeline({ defaults: { ease: "power2.out" }, scrollTrigger: { trigger: root.current, start: "top top", end: "bottom bottom", scrub: 0.6 } });
      const scene = (i: number, at: number) => {
        if (i > 0) tl.to(says[i - 1], { autoAlpha: 0, y: -40, duration: 0.35 }, at);
        tl.to(says[i], { autoAlpha: 1, y: 0, duration: 0.45 }, at + 0.2);
      };
      const score = { v: 0 }, lines = { v: 0 }, money = { v: 0 };
      const scoreEl = q(".score")[0], linesEl = q(".lines")[0], moneyEl = q(".money")[0];

      // 1 -> 2: tells get circled, the page scrolls down to the cards, the score climbs
      scene(1, 1);
      q(".mark").forEach((m, i) => tl.to(m, { autoAlpha: 1, scale: 1, duration: 0.3 }, 1.4 + i * 0.28));
      tl.to(q(".slopimg"), { yPercent: -38, duration: 1.2, ease: "power1.inOut" }, 2.4);
      tl.to(score, { v: data.score, duration: 1.8, onUpdate: () => { if (scoreEl) scoreEl.textContent = `${Math.round(score.v)}% slop`; } }, 1.4);
      // 3: three directions fan in over the page
      scene(2, 3.6);
      tl.to(q(".slopwrap"), { autoAlpha: 0.25, duration: 0.5 }, 3.7);
      tl.to(q(".dir"), { autoAlpha: 1, y: 0, rotate: (i) => (i - 1) * 4, duration: 0.7, stagger: 0.18, ease: "back.out(1.4)" }, 3.8);
      // 4: one is picked, the others drop, the real page writes itself in
      scene(3, 5.2);
      tl.to(q(".dir.d0, .dir.d2"), { y: 600, autoAlpha: 0, rotate: (i) => (i ? 14 : -14), duration: 0.6, ease: "power2.in" }, 5.2);
      tl.to(q(".dir.d1"), { y: -40, scale: 1.04, duration: 0.3 }, 5.25).to(q(".dir.d1"), { autoAlpha: 0, duration: 0.3 }, 5.7);
      tl.to(q(".built"), { clipPath: "inset(0 0 0% 0)", duration: 1.4, ease: "none" }, 5.7);
      tl.to(q(".builtimg"), { yPercent: -9, duration: 1.6, ease: "none" }, 6.4);
      tl.to(lines, { v: 341, duration: 1.4, ease: "none", onUpdate: () => { if (linesEl) linesEl.textContent = `${Math.round(lines.v)} lines written`; } }, 5.7);
      tl.to(q(".slopwrap"), { autoAlpha: 0, duration: 0.3 }, 5.7);
      // 5: the slop request, refused
      scene(4, 7.3);
      tl.to(q(".bubble"), { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.45 }, 7.5);
      // 6: publish, cancel Lovable
      scene(5, 8.8);
      tl.to(q(".bubble"), { autoAlpha: 0, y: -20, duration: 0.3 }, 8.8);
      tl.to(q(".shipped > *"), { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.25, ease: "back.out(1.3)" }, 9);
      tl.to(money, { v: 300, duration: 0.9, onUpdate: () => { if (moneyEl) moneyEl.textContent = `$${Math.round(money.v)} a year back`; } }, 9.4);
      tl.to({}, { duration: 0.6 }, 10.2);
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section className="story" ref={root} aria-label="How it works, as you scroll">
      <div className="stage">
        <div className="narr">
          {SAY.map((s, i) => (
            <div className="say" key={i}>
              <h2>{s.h}</h2>
              <p>{s.p}</p>
            </div>
          ))}
        </div>
        <div className="sframe">
          <div className="chrome">
            <i /><i /><i />
            <span className="mono url">relay sample</span>
            <span className="mono score">0% slop</span>
          </div>
          <div className="view">
            <div className="slopwrap">
              <div className="slopimg">
                <img src="/story/slop.jpg" alt="The AI-made Relay sample page" />
                {MARKS.map((m, i) => (
                  <div key={i} className="mark" style={{ left: pct(m.box[0], IMG_W), top: pct(m.box[1], IMG_H), width: pct(m.box[2], IMG_W), height: pct(m.box[3], IMG_H) }}>
                    <span>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="dirs">
              {data.directions.map((d, i) => (
                <div key={i} className={`dir d${i}`} style={{ background: d.palette.ground, color: d.palette.ink }}>
                  <b style={{ fontFamily: `'${d.fonts.body}', sans-serif` }}>{d.name}</b>
                  <strong style={{ fontFamily: `'${d.fonts.display}', serif` }}>{d.headline}</strong>
                  <em style={{ background: d.palette.accent, color: d.dark ? d.palette.ground : "#fff" }}>{d.cta}</em>
                  <span className="sw">{[d.palette.ground, d.palette.surface, d.palette.ink, d.palette.accent, d.palette.accent2].map((c, j) => <i key={j} style={{ background: c }} />)}</span>
                </div>
              ))}
            </div>
            <div className="built">
              <img className="builtimg" src="/story/relay-switchyard-tall.jpg" alt="The rebuilt Relay page, Signal Tower direction" />
              <span className="mono lines">0 lines written</span>
            </div>
            <div className="bubbles">
              <p className="bubble you">Make the headline bigger and add a purple glow behind it</p>
              <p className="bubble them">Made the headline bigger. I skipped the purple glow because glow and purple gradients are on the slop list. Instead I deepened the painted dusk behind the headline so it stands out.</p>
            </div>
            <div className="shipped">
              <a className="mono livepill" href={data.gallery[1].url} target="_blank" rel="noreferrer">Live: {data.gallery[1].url.replace("https://", "")}</a>
              <div className="cancelcard">
                <p className="big">Now cancel Lovable.</p>
                <p className="row"><span>Lovable Pro</span><s>$25 / month</s></p>
                <p className="row"><span>This</span><b>$0</b></p>
                <p className="money">$0 a year back</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Gallery() {
  return (
    <section className="gallery" aria-label="Real sites it made today">
      <div className="ghead">
        <h2>Real sites it made today.</h2>
        <p>Nothing staged. Relay is a made-up sample company; the taqueria came from a two-line description. Click any of them, they're live.</p>
      </div>
      <div className="grow-row">
        {data.gallery.map((g, i) => (
          <a key={i} className="gcard" href={g.url} target="_blank" rel="noreferrer" style={{ transform: `rotate(${[-1.5, 1, -0.8, 1.4, -1.1][i]}deg)` }}>
            <img src={g.img} alt={`${g.name}, ${g.look} direction`} loading="lazy" />
            <span className="glabel"><b>{g.look}</b><span>{g.name}</span></span>
          </a>
        ))}
      </div>
    </section>
  );
}
