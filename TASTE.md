# Unslop taste library

What Unslop knows about good landing pages. It is the brain the redesign engine reads before it touches a site, and
the rubric its "slop check" scores against. Written 2026-11-07 from a study of ~95 live sites screenshotted at four
scroll depths (`research/shots`, `research/sheets`, fonts / colors / motion tech in `research/data.json`), the 21st.dev
component and template catalog, and the installed taste skills (design-taste-frontend, high-end-visual-design,
impeccable, frontend-design). Where those skills disagree with the house rules, the house rules win (noted inline).

---

## 1. The one-line test

A slop page could belong to any company. An unslopped page could only belong to this one.

Every great page in the study did three things a template never does:
1. **It has a world.** Something specific is behind or around the content: a painted landscape (Railway, Cursor), a
   misty photo with a desk in it (Mercury), a container ship (Flexport), a whole desktop OS (PostHog), a street of shops
   (Clickit), a field of flying coins (Gumroad). Flat white or flat navy with floating cards is not a world.
2. **The product is the hero.** The first screen shows the real thing working: Wise's live send-money calculator,
   Granola's notepad next to a video call, Cal.com's booking calendar, Cursor's agent window, Dub's dashboard. Never
   a row of three icon cards that describe the product in adjectives.
3. **It owns something.** One color nobody else in the category uses (Cash App green, Wise lime, Gumroad pink,
   Ramp yellow), one typeface with character (Wise heavy condensed caps, Granola's soft serif, Resend's Domaine,
   Railway's IBM Plex Serif), or one signature device (Stripe's ribbon, Plaid's tinted Franklin engraving, Notion's
   doodle people, Duolingo's mascot doing something different in every section).

If a redesign has all three it is unslopped. If it has none, no amount of polish fixes it.

---

## 2. The slop tells (what the detector circles, and the fix for each)

Severity: **loud** = anyone can see it in two seconds; **quiet** = designers see it.

| Tell | How to spot it | Fix |
|---|---|---|
| Purple/violet to pink gradient hero (loud) | hue 260-330 gradient behind the H1 | pick a world (section 3) and a palette from the brand's own logo or photography |
| "Elevate / Supercharge / Unleash / Transform / Seamless / Next-gen / Revolutionize" (loud) | regex on headlines and buttons | say the concrete outcome: "Every box. On time.", "Go from 0 to $1" |
| Three identical feature cards with an icon circle on top (loud) | 3 sibling cards, same size, icon + title + 2 lines | product-as-hero shots, a zig-zag of real screenshots, an asymmetric bento, or a pinned scroll story |
| Eyebrow pill over every heading (loud, banned here) | small uppercase tracked label above H1/H2 | delete it; the headline does the work |
| Numbered section labels 01 / 02 / 03 (loud, banned) | `0\d` or `Step 1` labels | use the verb itself as the label: "Install", "Connect", "Ship" |
| Em dashes in visible copy (quiet but universal, banned) | the characters U+2014 and U+2013 | period, comma, colon or parentheses |
| Default font: Inter, Roboto, Arial, Open Sans, system UI (quiet) | computed font-family of h1/body | a real pairing from section 4 |
| Default buttons: 8px radius, blue/purple fill, "Get Started" + "Learn More" (loud) | two buttons, generic labels | one action with a real verb ("Order beans", "Track a box", "Start free") and the brand's own shape |
| Gradient text on the headline (quiet) | `background-clip: text` | solid color; one word in the accent at most |
| Glassmorphism, blur blobs, floating orbs, glow (loud, glow is banned here) | backdrop-filter on cards, radial blobs | solid surfaces, real shadows from one light direction |
| Fake product UI made of gray divs (quiet) | skeleton bars standing in for a product | the real product (screenshot or live component), or a photo |
| Fake-perfect numbers and stock names (quiet) | 99.9%, 10x, "Sarah Chen", "Acme" | real numbers from the site, or none |
| Centered everything, same padding everywhere (quiet) | every section centered at the same width | vary the layout: split, full-bleed, offset, pinned |
| Stock emoji or thick Lucide icons as the only visuals (loud) | emoji in headings, icon-only feature rows | photography, illustration, product shots |
| "Trusted by" gray logo strip as the second section on every page (quiet) | grayscale logo row right under the hero | fine when real; otherwise drop it; never fake logos |
| Testimonial carousel of three quote cards with avatar circles (quiet) | 3 quote cards | one big quote with a real face, or duotone portraits (Notion) |
| No motion, or every element fading up the same way (quiet) | identical `fade-up` on everything | one motion language that fits the world (section 6) |

The detector's output should name the tell in plain words, point at the element, and say the fix in one line.

---

## 3. Art directions (pick one per site; never mix two)

House rule: never a yellow or pale-yellow ground. Yellow is allowed only as a small accent. Bright means sky blue,
cobalt, tomato, mint, cream, real photo color, not yellow.

Each direction is a complete look. The engine picks the best three for the site and shows them as choices. Fonts are
Google Fonts so every direction ships for free.

### A. Living world (photo)
A photoreal place behind the page, moving slowly (pan at real size, drifting clouds, day to dusk on scroll), content on
solid panels or straight on the photo with a dark gradient. *Seen at:* Mercury (misty valley + desk), Flexport (ship
at sea + dashboard), Clickit (street of shops), Cursor/Railway use painted versions.
- **Fits:** shops, travel, food, logistics, real estate, anything physical; also fintech that wants calm.
- **Type:** Bricolage Grotesque 800 for headlines, Figtree body. Or Instrument Serif + Geist for calm brands.
- **Palette:** taken from the photo (sky blue, one warm accent from the scene), white panels.
- **Signature:** the photo IS the brand; one live product card sits on top of it.
- **Motion:** slow pan or parallax at real size (never zoom in), panels rise, time of day changes with scroll.
- **Imagery:** generated photos, real-photo brief (lens, light), never cartoon.

### B. Painted world + real product
A painterly or pixel-art landscape plate with the real product window floating in front. *Seen at:* Railway (pixel
dusk mountains + train), Cursor (painted landscape behind the agent window), Intercom (sketched birds).
- **Fits:** developer tools and AI products that want warmth instead of black.
- **Type:** IBM Plex Serif or Instrument Serif headlines + Geist / Geist Mono.
- **Palette:** dusk purples are fine here only as painted sky, never as UI gradients; UI stays neutral.
- **Signature:** the product window is always a real screenshot or live component.

### C. Black, quiet, moving
Near-black ground (#0b0b0c, never pure black), white type, one accent, and ONE living object: a rotating dot sphere,
a 3D envelope (Resend), a red ball (Raycast), a dot field that reacts to the cursor. No glow. *Seen at:* Linear, Resend,
Raycast, Cursor, Cal.com, Framer.
- **Fits:** dev tools, AI infrastructure, security, anything technical and premium.
- **Type:** Geist 600-700 tight (-0.05em) or a display serif (Domaine-like: Instrument Serif) for contrast.
- **Palette:** #0b0b0c, #f5f5f5, grays #77777e / #a1a1a6, one accent (tomato, mint or lime), used sparingly.
- **Signature:** the one moving object, built in canvas/WebGL, drawn from data where possible.
- **Motion:** the object always moves; text stays still and crisp; product shots slide in on scroll.

### D. Flat color, loud type
One saturated ground (cobalt, tomato, lime, electric green) with huge kinetic type in bands that slide in opposite
directions, a rotating star or sticker. *Seen at:* Cash App (all green), Wise (lime + heavy caps), Gumroad (black +
pink flying coins), Duolingo's color blocks.
- **Fits:** studios, consumer apps, fintech for young people, events, creators.
- **Type:** Bricolage Grotesque 800 condensed, Anybody 900, or Archivo Black for headlines; Figtree body.
- **Palette:** one owned color at full saturation + cream + ink + one contrast color. No gradients.
- **Signature:** the owned color itself; marquee bands; one playful 3D object (coins, stars).
- **Motion:** marquees, things flying in from offscreen, sticky color sections swapping on scroll.

### E. Stripes, stickers and a menu you can taste (DTC / shop)
Cream ground, a pattern from the business (awning stripes, tablecloth check, label art), chunky retro display type,
round spinning stickers, tilted product cards in bold flat colors, real product photos with a white border.
*Seen at:* DTC food brands (Graza, Omsom, Fishwife, Ghia), Clickit's sample shop sites.
- **Fits:** food, drink, retail, beauty, local businesses.
- **Type:** Caprasimo or Bagel Fat One for headlines (sparingly), Figtree / Bricolage for body.
- **Palette:** cream #fff4e4, ink, tomato, cobalt, mint; the product's own packaging colors win.
- **Signature:** the pattern + stickers; menu cards that bob; hand-lettered accents allowed.
- **Motion:** stickers spin, cards bob, stripes slide; never subtle.
- **From the real DTC sites:** the packaging art sets the palette (Brightland's floral boxes on oxblood, Fishwife's
  tin art on sky blue, Ghia's red bottle on sand); flat-lay product photos with real props (Glossier's bottle on a
  handwritten note with a coffee ring); condensed serif caps for the headline ("LE FIZZ IS FINALLY BACK IN STOCK");
  a marquee strip of plain claims ("NO ARTIFICIAL FLAVORS / NO CAFFEINE / NO ADDED SUGAR"); hand-drawn doodles.
  What they all get wrong: an email popup on arrival covering the page. Unslop never adds one.

### F. Editorial serif
Warm off-white or deep navy, a big characterful serif with one italic word, generous space, tinted photography.
*Seen at:* Anthropic (house serif on cream), Granola (soft serif, olive accent), the 21st "Midnight" template (navy +
gold italic), Intercom.
- **Fits:** AI writing tools, finance, law, research, premium services, journals.
- **Type:** Instrument Serif or Fraunces (opsz high) headlines, Geist or Figtree body.
- **Palette:** cream #f4f1ea or navy #0f1830, ink, one accent (olive, gold, vermilion).
- **Signature:** the italic word in the accent color; duotone portraits (Notion style) for social proof.
- **Watch:** this is the direction most likely to drift back into "AI calm"; it needs a real image or product shot.

### G. A metaphor you can walk through
The whole page is one object or place: a desktop OS with windows (PostHog), a descent from a volcano into a cup
(21st coffee template), a beer bottle that rides the scroll while sections pass (21st beer template), a building
directory, a train journey. *Seen at:* PostHog, 21st templates, Clickit's main street.
- **Fits:** any brand willing to be memorable; best for products with a story.
- **Signature:** the metaphor itself. Every section is a stop on the same journey.
- **Motion:** GSAP pinned scenes; the object stays while the world changes around it.

### H. One ink, engraved (monochrome illustration)
A single ink color (cobalt, oxblood, forest) on paper, everything drawn as engraving or line art, serif type.
*Seen at:* Plaid (Franklin engraving, tinted), 21st "cobalt engraving" template.
- **Fits:** finance, law, heritage brands, institutions that want to feel old and trustworthy but fresh.
- **Type:** Fraunces or Instrument Serif + a mono for small labels.
- **Signature:** the illustration; the one ink.

### I. Product object, type around it
One hero object (a bottle, a phone, a card, a device) cut out at large size with giant type passing behind and in front
of it. *Seen at:* 21st beer template (bottle breaking "MONSOON SEASON"), Apple product pages, Cash App phone.
- **Fits:** physical products, apps with a strong phone UI, cards.
- **Signature:** the object overlapping the headline; it moves with the scroll.

### J. A computer inside the page (retro OS / window chrome)
The page is a desktop: draggable windows, a dock, a menu bar, old-OS chrome, a music player that actually plays.
*Seen at:* Poolsuite (Mac OS 9 windows on pink, a working player), PostHog (whole site as an OS with a grassy
wallpaper and desktop icons), Oatly (browser-window frame around a tabloid page).
- **Fits:** tools for creators and developers, music, anything with a playful, nostalgic brand.
- **Type:** Geist Mono or a pixel font for chrome, a loud display face for content.
- **Signature:** windows you can open; every section is an app on the desktop.

### K. Poster type
The headline IS the image: enormous condensed or tabloid type filling the screen, collaged with a photo or a product.
*Seen at:* Oatly (tabloid caps over a flat-lay photo with polaroids), Liquid Death (metal-band art), Partiful (its
own "janky" display face), Awwwards sites of the day ("BELGRADE ARBOR", "MECHA", "DON'T LOOK UP" type posters).
- **Fits:** consumer brands with attitude, events, drinks, media, launches.
- **Type:** Anton or Archivo Black condensed caps, or Bricolage at extreme widths; body in Figtree.
- **Signature:** the voice. The copy has to be as loud as the type (Liquid Death: "Murder your thirst").

### L. Line-art world
Everything is drawn in one line weight: houses, pets, people, objects, with a single hot accent color for the action.
*Seen at:* Lemonade (line-art house and dog, hot pink buttons, Merriweather), Notion (doodle people), Intercom (sketched
birds).
- **Fits:** insurance, health, education, friendly B2C that needs to feel human.
- **Signature:** the drawings animate (draw themselves on scroll, characters move).

---

## 3b. Voice (the copy is half the design)

The best brands sound like a person, and the slop sounds like a brochure. Same product, two voices:
- Slop: "Elevate your coffee experience with handcrafted blends." Unslopped: "Roasted on the pier. Gone by Friday."
- Slop: "Transforming global logistics." Unslopped: "Every box. On time." (Flexport says "AI-powered logistics for
  the real world"; Cash App says "The way money should work"; Gumroad says "Go from 0 to $1".)
- Rules: a concrete outcome, a number, or a dare. Short. No adjectives that any company could claim. Keep the
  company's real facts (names, places, prices, hours) and drop the filler around them.

## 3c. Proof that feels real

- Live counters of something real ticking up (Opal "663,860,293 hours saved", 21st "Used by 4,617,065 builders").
- The product doing the thing in the hero (Wise calculator returns a real quote).
- Real faces, duotone-tinted (Notion) or in the world (Partiful party photos), never avatar circles.
- Press quotes as type, not logos ("Best solution to the party-invitation problem", The Atlantic, on Partiful).

---

## 4. Type pairings that read as designed

| Headline | Body | Feels like |
|---|---|---|
| Bricolage Grotesque 800 (tight) | Figtree | bold, modern, friendly |
| Instrument Serif 400 | Geist | calm editorial, AI writing |
| Fraunces 500-900 (soft, opsz) | Geist | warm, crafted, food, finance |
| Caprasimo | Figtree | retro shop, food, playful |
| Anybody 900 (wide) | Figtree | loud, sporty, street |
| Geist 700 (-0.05em) | Geist / Geist Mono | technical, precise |
| IBM Plex Serif | IBM Plex Sans / Mono | engineering with warmth |
| Archivo Black | Archivo | poster, sale, event |

Rules: one family for headlines, one for body, one mono at most. Headlines 84-150px on desktop with tight tracking;
body 18-22px; never bold body text as decoration.

## 5. Components that feel premium (seen working)

- **Hero:** the product working (calculator, editor, booking) or the world with one product card on it. One action.
- **Proof:** a big real number from the product (Ramp "$1M+ saved"), or tinted portraits with a short quote (Notion).
- **Features:** zig-zag real screenshots with one sentence each; or a pinned scroll where the product changes state as
  you scroll; or a bento where each tile shows a different real state of the product.
- **Logo wall:** only real logos, monochrome, one row, no heading or a plain "Used by".
- **Pricing:** two or three plans max, the recommended one visibly different in color, not with a "Most popular" pill.
- **CTA band:** a full-bleed color band or the world again, a giant marquee of the brand line behind the button.
- **Footer:** big wordmark rising out of the world (21st alpine template), or the world at night.

## 6. Motion recipes

- Words rise per beat with a short blur clearing in the first third (never a line sitting blurred).
- One object always moves (dot sphere, coins, balloons, stickers); background never fully still (slow pan, drifting clouds).
- Scroll: pinned scenes where the product changes state; marquees that reverse direction on scroll; sections that
  swap ground color as they enter.
- Never zoom into photos or footage; slide, rise, wipe, flip.
- Reveal transitions that suit the world: an awning wipe for a shop, an iris for a port, blinds of color for a studio.
- Tools: GSAP + ScrollTrigger for scroll stories, canvas/WebGL for the living object, CSS for marquees.

## 7. Picking the six directions for a site

Three speak the genre of the best sites in the site's own market (studied live, see 7c), three are bold alternatives from
the table below and from the 21st.dev genres in 7d.

| Site type | Offer these three |
|---|---|
| AI / dev tool startup | C black quiet moving, B painted world + product, J computer inside the page |
| Enterprise / logistics / B2B | A living world photo, G walk-through metaphor, H one ink |
| Fintech consumer | D flat color loud type, I product object, A living world |
| Insurance / health / education | L line-art world, A living world (soft photo), F editorial |
| Shop / food / drink / local | E stripes and stickers, A living world, K poster type |
| Studio / agency / portfolio | D flat color, K poster type, C black moving |
| Creator / music / community / events | J computer inside the page, K poster type, D flat color |
| Writing / research / finance advice | F editorial serif, H one ink, B painted world |

The six offered must look nothing alike: never more than two dark ones, never more than two serif ones.

## 7c. Market genre directions (in the genre of the leaders, never copies)

DSlop opens the homepages of the three best-designed sites in the site's market and looks at them. A market direction
borrows the genre: the layout habits, the palette family, the type mood, the kind of imagery, so the site feels at home
next to its leaders. It never borrows their identity: no leader's logo, name, copy, illustration, mascot, signature
color pair or one-to-one layout. If a leader is itself slop (purple gradient, glow, pill badges), take nothing from it.

## 7d. 21st.dev template genres (references, never copies)

| Genre | The look | Fits |
|---|---|---|
| Ink sculpture | black ground, light headline left, one monochrome 3D ink ribbon or sculpture slowly turning right | calm B2B SaaS, support, AI ops |
| ASCII wake | white ground, a faint field of characters that ripples behind the hero | dev tools, infra, terminals |
| Asymmetric proof | one quote set off-center next to a huge ghosted numeral, a slow logo marquee under it | agencies, B2B proof |
| Product rides the scroll | one cut-out product photo travels down over giant condensed type on a saturated ground | drinks, food, DTC products |
| Cobalt engraving | cobalt line-engraving illustration (architecture, landscape) on white, serif headline inside a framed arch | finance, law, consulting, institutions |
| Origin descent | full-bleed landscape, huge white place name, an altitude or distance readout that changes as you scroll | coffee, travel, outdoor, origin stories |
| Device opens on scroll | a laptop or phone tilts open as you scroll to reveal the real app | SaaS with a strong product screen |
| Arrow field | a saturated field of tiny arrows or halftone dots, big white one-word headline | events, conferences, launches |
| Soft meadow | a pastel 3D field (flowers, grass) inside a rounded panel, small calm headline | consumer fintech, savings, wellness |
| Glyph portrait | an image made of large characters or glyphs filling the ground | AI, creative tools |
| Fanned cards | centered headline, a fan of real photos or posts at the bottom edge | creator tools, social, media |
| Inversion circle | one black circle that inverts the headline as you scroll | studios, agencies, design tools |
| Marquee and seal | giant outlined marquee words behind a centered button, a small round seal | studio closings, CTAs |
| Midnight guilloche | navy ground with fine guilloche line patterns, cream serif headline with one italic warm-gold word | AI assistants, premium productivity, private finance |
| Photo ring | a ring of photo tiles around a small centered headline | photo, media, marketplaces |
| Silk shader | full-bleed flowing silk in deep rose and black | beauty, fashion, music, luxury |
| Starburst wordmark | black ground, huge condensed wordmark with one hand-drawn starburst | personal sites, studios, footers |

Not a genre: a "Crafting Exceptional Websites" hero with purple gradient text on black is slop, even on 21st.dev.

## 7b. What the numbers from the study say (66 sites with full data)

- **Typefaces:** almost every strong site uses its own or a characterful typeface (Anthropic Serif, Cursor Gothic,
  Domaine, Quadrant, Diatype, Favorit, Suisse, Mona Sans, Partiful's "Janky" Inter, Duolingo Sans, Garamond Condensed,
  Basis Black). Plain Inter showed up on 4 of 66. A default font is the single fastest slop tell.
- **Headline size:** the median H1 is 54px (range 11 to 140). Big brands rarely shout; they get attention from the
  world and the image, not from a 150px headline. Loud type is a deliberate direction (D, K), not the default.
- **Length:** the median page is about 10 screens tall. One screen of hero and a footer is not a landing page.
- **Motion tech:** 17 of 66 run WebGL (13 on three.js), 23 use video, 27 have canvas elements. A living element is
  normal at this level, not a luxury.

## 8. Unslopped checklist (the engine runs this before showing a redesign)

- [ ] It has a world, the product is in the first screen, and it owns a color, a typeface or a device.
- [ ] Zero tells from section 2 (no em dashes, no eyebrow labels, no numbered sections, no purple gradient, no three
      same cards, no glow, no filler verbs).
- [ ] Real copy from the original site, rewritten to say concrete outcomes; real numbers only.
- [ ] One motion language; something moves in every screen; nothing zooms.
- [ ] Works at 375px wide: no horizontal scroll, type scales down, pinned scenes become simple stacks.
