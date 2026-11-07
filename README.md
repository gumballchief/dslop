# DSlop

**Your site, deslopped.** Paste any site (or drop a screenshot of it). DSlop circles what makes it look AI-made, with
the evidence from your own page, gives you three real art directions, rebuilds it live, lets you change anything in
chat, and publishes it to a live link. Then it tells you to cancel Lovable.

Live: **https://dslop.vercel.app**

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
   | linear.app | 8 | Not slop |
   | stripe.com | 10 | Not slop |
   | granola.ai | 10 | Not slop |

3. **Offers three directions** picked from a written taste library ([TASTE.md](TASTE.md)): each one a different world,
   palette, type pairing and motion language, written with the site's real facts.
4. **Builds it live.** The new page streams into the preview as Claude writes it, one complete HTML file.
5. **Edits in chat, and refuses slop.** Ask for a purple gradient and you get the closest version that still looks
   made by a person, with a note saying why.
6. **Publishes** to a live link on dslop.vercel.app, then shows what you just saved by not paying for Lovable.

Sites that block automated readers (Cloudflare challenges, 403s) are respected, not worked around: DSlop says so and
asks for a screenshot instead, which it reads just as well.

## How we used Seldon

Seldon is the hackathon's AI QA platform: an agent that drives a real browser through plain-English test cases. Our
two core workflows are written as code in [app/seldon.yml](app/seldon.yml):

- **A pasted site gets its AI tells named.** Open the app, try the sample, and the page must show the site name, a slop
  percentage, and a list of tells that includes the purple gradient.
- **A redesign is built live and published, then you can cancel Lovable.** Pick a direction, wait for the live build,
  publish, and a live link must appear with the "Now cancel Lovable" box.

[seldon.mjs](seldon.mjs) runs them through Seldon's REST API (validate, run, wait, report). Both workflows passed on
the first build, and were re-run against the final build at dslop.vercel.app.

## Stack

- Next.js 16 (App Router), React 19, TypeScript, plain CSS, GSAP for the scroll story
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

Published pages go to Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set, and to a local temp folder when it isn't.
Edit [TASTE.md](TASTE.md), then run `node scripts/taste.mjs` inside `app` to rebuild the prompt file.
