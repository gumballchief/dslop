# DSlop

**Your site, deslopped.** Paste any site (or drop a screenshot of it). DSlop circles what makes it look AI-made, with
the evidence from your own page, gives you three real art directions, rebuilds it live, lets you change anything in
chat, and publishes it to a live link. Then it tells you to cancel Lovable.

Live: **https://dslop.vercel.app** · Demo video (32 s): **https://dslop.vercel.app/demo.mp4**

Built in one day at **Ship Happens** (Seldon, San Francisco, November 7, 2026). The brief: bring a subscription you'd
like to stop paying for and build its replacement. Ours is **Lovable Pro, $25 a month**, because every site it makes
looks like the same purple gradient.

## What it does

1. **Reads the site.** It fetches the page, pulls out every real fact (names, prices, hours, customers) and finds the
   tells it can prove from the code: purple to pink gradients, filler words like "seamless" and "supercharge", em
   dashes, eyebrow labels, three identical icon cards, default fonts, "Get Started" next to "Learn More".
2. **Judges it honestly.** Claude looks at the words, a screenshot and the code signals and scores the site on a fixed
   rubric. A crafted site gets a low score and a plain "Not slop" with what already works. It never invents tells to
   fill a list. Real results from today:

   | Site | Score | Verdict |
   | --- | --- | --- |
   | The AI-made sample (`/samples/relay.html`) | 90 | AI template |
   | linear.app | 8 to 12 | Not slop |
   | stripe.com | 10 | Not slop |
   | granola.ai | 10 | Not slop |

3. **Studies your market.** It works out what the site is for, names the best-designed sites in that market, and
   opens their homepages live (FocusFlow, a study app, got Endel, Headspace and Forest; Relay got Vercel, Resend and
   Railway), so you can see what the top of your market looks like.
4. **Shows six real directions, not color swatches.** Three are DSlop's own take on one leader each: the same general
   site look and level of quality (so you think "another quiz site, like Duolingo"), with the placements moved, the
   components swapped for close cousins, and its own colors and type (never a logo, copy, illustration or mascot), and three are bold alternatives from a written taste
   library ([TASTE.md](TASTE.md)) and the best 21st.dev template genres. It draws the actual first screen of all six
   at once, streaming in side by side. You see the real thing before you choose.
5. **Talk to it while you pick.** A chat next to the six: say hi, ask why a look fits, or ask for different ones
   ("make them all darker", "one more like Apple") and the changed looks redraw on the spot.
6. **Lets you shape the one you like.** Open a preview big and change anything in chat: colors, fonts, the headline,
   the layout, whole components. Every change lands on the preview right away.
7. **Builds the full site from it.** A big DSlopping screen shows the old page being wiped away by your pick, with real
   progress read from the page as Claude writes it. The full page keeps the screen you approved and carries your
   changes all the way down.
8. **Keeps editing in chat, and refuses slop.** Ask for a purple gradient and you get the closest version that still
   looks made by a person, with a note saying why.
9. **Publishes** to a live link on dslop.vercel.app, then shows what you just saved by not paying for Lovable.

Sites that block automated readers (Cloudflare challenges, 403s) are respected, not worked around: DSlop says so and
asks for a screenshot instead, which it reads just as well.

## The demo

https://dslop.vercel.app/demo.mp4 is the whole flow on a made-up plant shop (Bloomly), every frame real: the tells
circled, the market study (Bloomscape, Patch Plants and Léon & George opened live), six real first screens, the chat,
the DSlopping build screen, the page rebuilt with the motion engine, a purple-gradient request refused, the live publish
(https://dslop.vercel.app/s/bloomly-prytw), an honest "not slop" on linear.app, and Seldon's own recording of the final
run. The script that ran it through the app is [research/demos3.mjs](research/demos3.mjs).

## How we tested it

A bench of 48 sites ([research/bench](research/bench/RESULTS.md)): well-known crafted sites, 16 real sites built with
Lovable, our three deliberately AI-made samples, templates, and broken or blocked addresses. It runs the real app and
checks every quote DSlop cites and every number in its facts against the rendered page. It found that DSlop was reading
JavaScript-heavy Lovable pages half blind, so pages are now opened in a real headless Chrome on the server. Typical
Lovable landing pages went from 45 to 62 up to 72 to 84, crafted sites stayed between 4 and 18, and 180 of 184 quotes
were found word for word.

## How we used Seldon

Seldon is the hackathon's AI QA platform: an agent that drives a real browser through plain-English test cases. Our
two core workflows are written as code in [app/seldon.yml](app/seldon.yml):

- **A pasted site gets its AI tells named.** Open the app, try the sample, and the page must show the site name, a slop
  percentage, and a list of tells that includes the purple gradient.
- **A redesign is built live and published, then you can cancel Lovable.** Wait for the six real previews, open the
  first one, build the full site from it, publish, and a live link must appear with the "Now cancel Lovable" box.

[seldon.mjs](seldon.mjs) runs them through Seldon's REST API (validate, run, wait, report, save).

Final run, November 7, 2026, against the final build at https://dslop.vercel.app (the market study, six real
previews, the talk chat, the shape chat, the DSlopping build screen, the polish pass and the motion engine), experiment
`e4fca32f-777a-4028-9d12-32ac9f1576bf`: **2 of 2 passed.**

| Workflow | Verdict | What Seldon's agent saw |
| --- | --- | --- |
| A pasted site gets its AI tells named | PASS | The site name Relay, a "92% slop" badge, and a list of tells led by "Purple to pink gradient", citing the real CSS values |
| A redesign is built live and published, then you can cancel Lovable | PASS | "It's live" with a live link on dslop.vercel.app/s/..., right above the "Now cancel Lovable." box and its billing button |

Both workflows also passed on every earlier build of the day (experiments `102f055a-...`, `00395cca-...`, `c540a002-...`, `ae7cab13-...` and `a9c13a13-...`).

## Stack

- Next.js 16 (App Router), React 19, TypeScript, plain CSS, GSAP for the scroll story
- Serverless headless Chrome (puppeteer-core + @sparticuz/chromium) to read pages the way a person sees them
- Claude Opus 5.5 through the Anthropic TypeScript SDK: structured outputs (zod) for the analysis and chat edits,
  streaming with fast mode for the live build, the taste library as a cached system prompt
- Vercel for hosting, Vercel Blob for published pages
- Seldon for QA

## Run it yourself

```bash
cd app
npm install
ANTHROPIC_API_KEY=your-key npm run dev
```

Three made-up sample sites live in `app/public/samples` (Relay, Bloomly, Vaultly), each built to look AI-made on
purpose, so there is always something to test against.

Published pages go to Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set, and to a local temp folder when it isn't.
Edit [TASTE.md](TASTE.md), then run `node scripts/taste.mjs` inside `app` to rebuild the prompt file.
