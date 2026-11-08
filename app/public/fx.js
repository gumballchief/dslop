/* DSlop FX: the motion engine every DSlop page loads (<script src="/fx.js" defer></script>).
   Turn an effect on with data-fx="name" (or data-reveal) on any element. Content is always visible without this file,
   and nothing moves for people who ask for reduced motion. No dependencies. */
(function () {
  "use strict";
  if (window.__dsfx) return;
  window.__dsfx = true;
  var root = document.documentElement;
  var still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia && matchMedia("(pointer: fine)").matches;
  root.classList.add(still ? "fx-still" : "fx");

  var css = [
    ".fx [data-reveal]{opacity:0;transition:opacity .9s cubic-bezier(.2,.7,.2,1),transform .9s cubic-bezier(.2,.7,.2,1),filter .9s,clip-path 1.1s cubic-bezier(.7,0,.2,1)}",
    ".fx [data-reveal='up'],.fx [data-reveal='']{transform:translateY(34px)}",
    ".fx [data-reveal='left']{transform:translateX(-46px)}",
    ".fx [data-reveal='right']{transform:translateX(46px)}",
    ".fx [data-reveal='blur']{filter:blur(12px);transform:translateY(14px)}",
    ".fx [data-reveal='clip']{opacity:1;clip-path:inset(0 0 100% 0)}",
    ".fx [data-reveal='scale']{transform:scale(.94)}",
    ".fx [data-reveal].fx-in{opacity:1;transform:none;filter:none;clip-path:inset(0 0 0 0)}",
    ".fx-word{display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.06em;margin-bottom:-.06em}",
    ".fx-word>span{display:inline-block;transform:translateY(105%);transition:transform .95s cubic-bezier(.2,.75,.15,1)}",
    ".fx-split-in .fx-word>span{transform:none}",
    ".fx-layer{position:absolute;inset:0;pointer-events:none;z-index:-1}",
    "[data-fx~='spotlight'],[data-fx~='dots'],[data-fx~='lines'],[data-fx~='sonar'],[data-fx~='grain']{isolation:isolate;overflow:hidden}",
    ".fx-grain{position:absolute;inset:-50%;pointer-events:none;z-index:2;opacity:.09;mix-blend-mode:multiply;animation:fxgrain 1.2s steps(6) infinite}",
    "@keyframes fxgrain{0%{transform:translate(0,0)}25%{transform:translate(-3%,2%)}50%{transform:translate(2%,-3%)}75%{transform:translate(-2%,-1%)}100%{transform:translate(1%,3%)}}",
    "[data-fx~='marquee']{overflow:hidden;display:flex;gap:var(--fx-gap,48px);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}",
    ".fx-mtrack{display:flex;flex:none;gap:var(--fx-gap,48px);min-width:100%;animation:fxmarq var(--fx-speed,32s) linear infinite}",
    "[data-fx~='marquee'][data-fx-dir='right'] .fx-mtrack{animation-direction:reverse}",
    "[data-fx~='marquee']:hover .fx-mtrack{animation-play-state:paused}",
    "@keyframes fxmarq{to{transform:translateX(calc(-100% - var(--fx-gap,48px)))}}",
    "[data-fx~='tilt']{transform-style:preserve-3d;transition:transform .5s cubic-bezier(.2,.7,.2,1);will-change:transform}",
    ".fx-sheen{position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .4s;background:radial-gradient(420px circle at var(--fx-x,50%) var(--fx-y,50%),rgba(255,255,255,.28),transparent 45%)}",
    "[data-fx~='tilt']:hover .fx-sheen{opacity:1}",
    "[data-fx~='magnetic']{transition:transform .45s cubic-bezier(.2,.8,.2,1);will-change:transform}",
    "[data-fx~='cardlight']>*{position:relative;overflow:hidden}",
    "[data-fx~='cardlight']>*::before{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .35s;background:radial-gradient(360px circle at var(--fx-x,50%) var(--fx-y,50%),var(--fx-light,rgba(255,255,255,.22)),transparent 55%)}",
    "[data-fx~='cardlight']:hover>*::before{opacity:1}",
    "[data-fx~='horizontal']{position:relative}",
    "[data-fx~='horizontal']>.fx-sticky{position:sticky;top:0;height:100vh;overflow:hidden;display:flex;align-items:center}",
    "[data-fx~='horizontal'] .fx-track{display:flex;gap:28px;will-change:transform;padding:0 6vw}",
    "[data-fx~='sticky-story']{display:grid;grid-template-columns:1fr 1fr;gap:6vw;align-items:start}",
    "[data-fx~='sticky-story'] .fx-media{position:sticky;top:12vh;height:76vh}",
    "[data-fx~='sticky-story'] [data-media]{position:absolute;inset:0;opacity:0;transform:translateY(18px) scale(.98);transition:opacity .7s,transform .7s cubic-bezier(.2,.7,.2,1)}",
    "[data-fx~='sticky-story'] [data-media].fx-on{opacity:1;transform:none}",
    "[data-fx~='sticky-story'] [data-step]{min-height:70vh;display:flex;flex-direction:column;justify-content:center;opacity:.35;transition:opacity .5s}",
    "[data-fx~='sticky-story'] [data-step].fx-on{opacity:1}",
    "@media (max-width:820px){[data-fx~='sticky-story']{grid-template-columns:1fr}[data-fx~='sticky-story'] .fx-media{position:relative;top:0;height:56vh}[data-fx~='sticky-story'] [data-step]{min-height:auto;padding:28px 0;opacity:1}}",
    "[data-fx~='device']{transform-origin:50% 100%;will-change:transform}",
    ".fx-progress{position:fixed;left:0;top:0;height:3px;width:100%;transform-origin:0 50%;transform:scaleX(0);z-index:9999;pointer-events:none}",
    ".fx-cursor{position:fixed;left:0;top:0;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;pointer-events:none;z-index:10000;transition:scale .25s cubic-bezier(.2,.7,.2,1),opacity .25s;mix-blend-mode:difference;background:#fff}",
    ".fx-cursor.fx-big{scale:3.8}",
    ".fx-still .fx-word>span{transform:none}"
  ].join("\n");
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  var $ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var attr = function (el, k, d) { var v = el.getAttribute("data-fx-" + k); return v === null || v === "" ? d : v; };
  var num = function (el, k, d) { var v = parseFloat(attr(el, k, "")); return isNaN(v) ? d : v; };
  var colorOf = function (el) { return attr(el, "color", getComputedStyle(el).color); };
  var pointer = { x: -9999, y: -9999, active: false };
  addEventListener("pointermove", function (e) { pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; }, { passive: true });
  document.addEventListener("pointerleave", function () { pointer.active = false; });

  /* one loop for everything that moves every frame; each job runs only while its element is on screen */
  var jobs = [];
  var visible = new WeakMap();
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (es) { es.forEach(function (e) { visible.set(e.target, e.isIntersecting); }); }, { rootMargin: "120px" }) : null;
  function job(el, fn) { jobs.push({ el: el, fn: fn }); if (io) io.observe(el); else visible.set(el, true); }
  var t0 = performance.now();
  function frame(now) {
    var t = (now - t0) / 1000;
    for (var i = 0; i < jobs.length; i++) if (visible.get(jobs[i].el) !== false) jobs[i].fn(t);
    requestAnimationFrame(frame);
  }

  function layer(el, tag) {
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    var c = document.createElement(tag || "div");
    c.className = "fx-layer";
    el.insertBefore(c, el.firstChild);
    return c;
  }
  function canvasFor(el) {
    var c = layer(el, "canvas"), ctx = c.getContext("2d"), dpr = Math.min(2, window.devicePixelRatio || 1);
    var size = { w: 0, h: 0 };
    function fit() { var r = el.getBoundingClientRect(); size.w = r.width; size.h = r.height; c.width = Math.max(1, r.width * dpr); c.height = Math.max(1, r.height * dpr); c.style.width = r.width + "px"; c.style.height = r.height + "px"; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    fit();
    if ("ResizeObserver" in window) new ResizeObserver(fit).observe(el); else addEventListener("resize", fit);
    return { c: c, ctx: ctx, size: size };
  }
  function local(el) { var r = el.getBoundingClientRect(); return { x: pointer.x - r.left, y: pointer.y - r.top, inside: pointer.active && pointer.x >= r.left && pointer.x <= r.right && pointer.y >= r.top && pointer.y <= r.bottom }; }
  function rgba(color, a) {
    var probe = document.createElement("span"); probe.style.color = color; document.body.appendChild(probe);
    var m = getComputedStyle(probe).color.match(/[\d.]+/g) || [0, 0, 0]; probe.remove();
    return "rgba(" + m[0] + "," + m[1] + "," + m[2] + "," + a + ")";
  }

  /* backgrounds */
  var bg = {
    spotlight: function (el) {
      var l = layer(el), col = rgba(colorOf(el), num(el, "strength", 0.22)), size = num(el, "size", 520);
      var x = 0.5, y = 0.4;
      job(el, function (t) {
        var p = local(el), r = el.getBoundingClientRect();
        var tx = p.inside ? p.x / r.width : 0.5 + Math.sin(t * 0.35) * 0.28, ty = p.inside ? p.y / r.height : 0.42 + Math.cos(t * 0.27) * 0.18;
        x += (tx - x) * 0.09; y += (ty - y) * 0.09;
        var s = size * (p.inside ? 1 : 1.08 + Math.sin(t * 1.3) * 0.05);
        l.style.background = "radial-gradient(" + s + "px circle at " + (x * 100) + "% " + (y * 100) + "%, " + col + ", transparent 62%)";
      });
    },
    dots: function (el) {
      var cv = canvasFor(el), gap = num(el, "gap", 26), col = colorOf(el), base = rgba(col, 0.22), hot = rgba(col, 0.85);
      job(el, function (t) {
        var w = cv.size.w, h = cv.size.h, ctx = cv.ctx, p = local(el);
        ctx.clearRect(0, 0, w, h);
        for (var yy = gap / 2; yy < h; yy += gap) for (var xx = gap / 2; xx < w; xx += gap) {
          var dx = xx - p.x, dy = yy - p.y, d = Math.sqrt(dx * dx + dy * dy), pull = p.inside ? Math.max(0, 1 - d / 180) : 0;
          var wave = Math.sin(xx * 0.012 + yy * 0.009 + t * 1.6) * 0.5 + 0.5;
          var ox = pull ? -dx / (d || 1) * pull * 14 : 0, oy = pull ? -dy / (d || 1) * pull * 14 : 0;
          ctx.fillStyle = pull > 0.15 ? hot : base;
          ctx.beginPath(); ctx.arc(xx + ox, yy + oy, 1 + wave * 0.9 + pull * 2.2, 0, 6.283); ctx.fill();
        }
      });
    },
    lines: function (el) {
      var cv = canvasFor(el), n = num(el, "count", 22), col = rgba(colorOf(el), 0.38);
      job(el, function (t) {
        var w = cv.size.w, h = cv.size.h, ctx = cv.ctx, p = local(el);
        ctx.clearRect(0, 0, w, h); ctx.strokeStyle = col; ctx.lineWidth = 1;
        for (var i = 0; i < n; i++) {
          var y0 = h * (i + 0.5) / n;
          ctx.beginPath();
          for (var x = 0; x <= w; x += 12) {
            var y = y0 + Math.sin(x * 0.006 + t * 0.8 + i * 0.4) * 14 + Math.sin(x * 0.013 - t * 0.5 + i) * 6;
            if (p.inside) { var dx = x - p.x, dy = y - p.y, d = Math.sqrt(dx * dx + dy * dy); if (d < 140) y += (dy / (d || 1)) * (140 - d) * 0.35; }
            x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
      });
    },
    sonar: function (el) {
      var cv = canvasFor(el), col = colorOf(el), rings = [], last = -9;
      el.addEventListener("pointerdown", function (e) { var r = el.getBoundingClientRect(); rings.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() / 1000 }); });
      job(el, function (t) {
        var w = cv.size.w, h = cv.size.h, ctx = cv.ctx, now = performance.now() / 1000;
        if (now - last > 2.2) { last = now; rings.push({ x: w * (0.2 + Math.random() * 0.6), y: h * (0.25 + Math.random() * 0.5), t: now }); }
        ctx.clearRect(0, 0, w, h);
        rings = rings.filter(function (r) { return now - r.t < 4; });
        rings.forEach(function (r) { var a = (now - r.t) / 4; for (var k = 0; k < 3; k++) { var rr = (a + k * 0.12) * Math.max(w, h) * 0.45; ctx.strokeStyle = rgba(col, Math.max(0, 0.45 * (1 - a) - k * 0.1)); ctx.beginPath(); ctx.arc(r.x, r.y, rr, 0, 6.283); ctx.stroke(); } });
      });
    },
    grain: function (el) {
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      var g = document.createElement("div");
      g.className = "fx-grain";
      g.style.backgroundImage = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";
      el.appendChild(g);
    }
  };

  /* text */
  function split(el) {
    var words = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3 && n.textContent.trim()) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement("span"); w.className = "fx-word";
            var i = document.createElement("span"); i.textContent = part; w.appendChild(i);
            frag.appendChild(w); words.push(i);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !/^(BR|SVG|IMG)$/i.test(n.tagName)) walk(n);
      });
    })(el);
    words.forEach(function (w, i) { w.style.transitionDelay = (i * 0.06) + "s"; });
    onSeen(el, function () { el.classList.add("fx-split-in"); }, attr(el, "on", "load") === "load");
  }
  function scramble(el) {
    var final = el.textContent, chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*";
    onSeen(el, function () {
      var start = performance.now(), dur = num(el, "duration", 900);
      (function step(now) {
        var k = Math.min(1, (now - start) / dur), out = "";
        for (var i = 0; i < final.length; i++) out += final[i] === " " || i < k * final.length ? final[i] : chars[(Math.random() * chars.length) | 0];
        el.textContent = out;
        if (k < 1) requestAnimationFrame(step); else el.textContent = final;
      })(start);
    });
  }
  function count(el) {
    var to = parseFloat(el.getAttribute("data-to") || el.textContent.replace(/[^\d.]/g, "")), dec = parseInt(el.getAttribute("data-decimals") || "0", 10);
    var pre = el.getAttribute("data-prefix") || "", suf = el.getAttribute("data-suffix") || "";
    if (isNaN(to)) return;
    var fmt = function (v) { return pre + v.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf; };
    el.textContent = fmt(0);
    onSeen(el, function () { var s = performance.now(), dur = num(el, "duration", 1600); (function step(now) { var k = Math.min(1, (now - s) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(to * e); if (k < 1) requestAnimationFrame(step); })(s); });
  }

  /* pointer toys */
  function tilt(el) {
    if (!fine) return;
    var max = num(el, "max", 10), sh = document.createElement("i"); sh.className = "fx-sheen";
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    el.appendChild(sh);
    el.addEventListener("pointermove", function (e) { var r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height; el.style.transform = "perspective(900px) rotateY(" + ((px - 0.5) * max * 2) + "deg) rotateX(" + ((0.5 - py) * max * 2) + "deg) translateZ(0)"; sh.style.setProperty("--fx-x", px * 100 + "%"); sh.style.setProperty("--fx-y", py * 100 + "%"); });
    el.addEventListener("pointerleave", function () { el.style.transform = ""; });
  }
  function magnetic(el) {
    if (!fine) return;
    var s = num(el, "strength", 0.35);
    el.addEventListener("pointermove", function (e) { var r = el.getBoundingClientRect(); el.style.transform = "translate(" + (e.clientX - r.left - r.width / 2) * s + "px," + (e.clientY - r.top - r.height / 2) * s + "px)"; });
    el.addEventListener("pointerleave", function () { el.style.transform = ""; });
  }
  function cardlight(el) {
    if (fine) el.addEventListener("pointermove", function (e) { $(":scope > *", el).forEach(function (c) { var r = c.getBoundingClientRect(); c.style.setProperty("--fx-x", e.clientX - r.left + "px"); c.style.setProperty("--fx-y", e.clientY - r.top + "px"); }); });
    var col = attr(el, "color", ""); if (col) el.style.setProperty("--fx-light", rgba(col, 0.25));
  }
  function marquee(el) {
    var track = document.createElement("div"); track.className = "fx-mtrack";
    while (el.firstChild) track.appendChild(el.firstChild);
    el.appendChild(track);
    var copy = track.cloneNode(true); copy.setAttribute("aria-hidden", "true"); el.appendChild(copy);
    el.style.setProperty("--fx-speed", num(el, "speed", 32) + "s");
  }

  /* scroll */
  var scrollers = [];
  function onScroll(fn) { scrollers.push(fn); }
  function progressOf(el) { var r = el.getBoundingClientRect(), vh = innerHeight; return Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height))); }
  function parallax(el) { var sp = parseFloat(el.getAttribute("data-speed") || "0.2"); onScroll(function () { var p = progressOf(el); el.style.transform = "translate3d(0," + ((p - 0.5) * sp * -240) + "px,0)"; }); }
  function horizontal(el) {
    var sticky = el.querySelector(".fx-sticky"), track = el.querySelector(".fx-track");
    if (!sticky || !track) return;
    function size() { el.style.height = (track.scrollWidth - innerWidth + innerHeight) + "px"; }
    size(); addEventListener("resize", size);
    onScroll(function () { var r = el.getBoundingClientRect(), total = el.offsetHeight - innerHeight, k = Math.max(0, Math.min(1, -r.top / (total || 1))); track.style.transform = "translate3d(" + (-k * (track.scrollWidth - innerWidth)) + "px,0,0)"; });
  }
  function device(el) { onScroll(function () { var r = el.getBoundingClientRect(), k = Math.max(0, Math.min(1, (innerHeight - r.top) / (innerHeight * 0.85))); el.style.transform = "perspective(1200px) rotateX(" + (1 - k) * 26 + "deg) scale(" + (0.9 + k * 0.1) + ")"; }); }
  function velocity(el) { var dir = attr(el, "dir", "left") === "right" ? 1 : -1; onScroll(function () { var p = progressOf(el); el.style.transform = "translate3d(" + dir * (p - 0.5) * 38 + "%,0,0)"; }); }
  function stickyStory(el) {
    var steps = $("[data-step]", el), media = $("[data-media]", el);
    function pick() { var best = 0, bd = 1e9; steps.forEach(function (s, i) { var r = s.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - innerHeight / 2); if (d < bd) { bd = d; best = i; } }); steps.forEach(function (s, i) { s.classList.toggle("fx-on", i === best); }); var key = steps[best] && steps[best].getAttribute("data-step"); media.forEach(function (m, i) { m.classList.toggle("fx-on", m.getAttribute("data-media") === key || (!key && i === best)); }); }
    pick(); onScroll(pick);
  }
  function draw(el) {
    var paths = $("path, line, polyline, circle, rect", el);
    paths.forEach(function (p) { var len = p.getTotalLength ? p.getTotalLength() : 600; p.style.strokeDasharray = len; p.style.strokeDashoffset = len; p.style.transition = "stroke-dashoffset 1.8s cubic-bezier(.6,0,.2,1)"; });
    onSeen(el, function () { paths.forEach(function (p, i) { p.style.transitionDelay = i * 0.08 + "s"; p.style.strokeDashoffset = "0"; }); });
  }
  function progressBar(el) { var bar = document.createElement("div"); bar.className = "fx-progress"; bar.style.background = colorOf(el); document.body.appendChild(bar); onScroll(function () { var max = document.documentElement.scrollHeight - innerHeight; bar.style.transform = "scaleX(" + (max > 0 ? scrollY / max : 0) + ")"; }); }
  function cursor() { if (!fine) return; var c = document.createElement("div"); c.className = "fx-cursor"; document.body.appendChild(c); addEventListener("pointermove", function (e) { c.style.transform = "translate(" + e.clientX + "px," + e.clientY + "px)"; c.classList.toggle("fx-big", !!(e.target.closest && e.target.closest("a,button,[data-fx~='tilt']"))); }, { passive: true }); }

  /* when something comes into view */
  function onSeen(el, fn, now) {
    if (now || !io) { fn(); return; }
    var o = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { fn(); o.disconnect(); } }); }, { threshold: 0.2 });
    o.observe(el);
  }
  function reveals() {
    $("[data-reveal-stagger]").forEach(function (parent) { $(":scope > *", parent).forEach(function (c, i) { if (!c.hasAttribute("data-reveal")) c.setAttribute("data-reveal", parent.getAttribute("data-reveal-stagger") || "up"); c.style.transitionDelay = i * 0.09 + "s"; }); });
    $("[data-reveal]").forEach(function (el) { onSeen(el, function () { el.classList.add("fx-in"); }); });
    setTimeout(function () { $("[data-reveal]").forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add("fx-in"); }); }, 1600);
  }

  function init() {
    if (still) { $("[data-fx~='marquee']").forEach(function (el) { el.style.overflowX = "auto"; }); return; }
    reveals();
    $("[data-fx]").forEach(function (el) {
      var names = el.getAttribute("data-fx").split(/\s+/);
      names.forEach(function (n) {
        try {
          if (bg[n]) bg[n](el);
          else ({ split: split, scramble: scramble, count: count, tilt: tilt, magnetic: magnetic, cardlight: cardlight, marquee: marquee, parallax: parallax, horizontal: horizontal, device: device, velocity: velocity, "sticky-story": stickyStory, draw: draw, progress: progressBar, cursor: cursor }[n] || function () {})(el);
        } catch (e) { if (window.console) console.warn("fx", n, e); }
      });
    });
    var ticking = false;
    function run() { ticking = false; for (var i = 0; i < scrollers.length; i++) scrollers[i](); }
    addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(run); } }, { passive: true });
    addEventListener("resize", run);
    run();
    requestAnimationFrame(frame);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
