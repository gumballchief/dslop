# DSlop bench

48 sites, read by the real app (`/api/analyze`), checked against the real pages by `bench.mjs`: every quote DSlop cites and every number in its facts is looked up on the rendered page.

Groups, set before running: **crafted** (well-designed, should score under 40 and be called not slop), **slop** (our deliberately AI-made samples, should score 70+), **ai-built** (16 real sites made with Lovable, judged by eye), **template**, **edge** (blocked, broken, not a URL).

| | Before (raw HTML only) | After (real Chrome render) |
|---|---|---|
| Crafted sites called not slop | 20 of 20 readable | 20 of 20 readable |
| Slop samples scored 70+ | 3 of 3 | 3 of 3 |
| Typical Lovable landing pages (FocusFlow, makeurquiz, sentio, mymanagment, talk2buy) | 62, 45, 55, 55, 62 | 80, 84, 74, 72, 80 |
| Quotes found word for word on the page | 140 of 149 | 180 of 184 |

Blocked sites (pump.fun, Aesop, Blue Bottle) are not worked around: DSlop says so and asks for a screenshot. Numbers flagged as not on the page were live counters and prices that change between visits (Stripe, Ramp, Airbnb), not invented ones.

What the bench found and what was fixed:

- Many real Lovable pages send almost no text until JavaScript runs, and their gradients and glow live in computed styles, so DSlop read them half blind. It now opens every readable page in a real headless Chrome (serverless on Vercel), reads the text after JavaScript, takes its own screenshot, and measures gradient text, glow, purple gradients, pill labels over the headline and the real fonts.
- DSlop used em dashes in its own writing on over half the sites. Its own words are now cleaned; quotes from the site stay exact.
- Quotes were sometimes shortened or had the site punctuation changed. Quotes must now be exact.
- "not a website" showed a raw error. It now gets a plain-English message.

| site | group | before | after |
|---|---|---|---|
| localhost:3090/samples/relay.html | slop | 92 | 92 |
| localhost:3090/samples/bloomly.html | slop | 88 | 90 |
| localhost:3090/samples/vaultly.html | slop | 86 | 92 |
| focus-flow-stdy.lovable.app | ai-built | 62 | 80 |
| mycreato.com | ai-built | 58 | 62 |
| sentio.run | ai-built | 55 | 74 |
| trysiri.com | ai-built | 38 | 32 |
| makeurquiz.lovable.app | ai-built | 45 | 84 |
| freesubtitlemaker.lovable.app | ai-built | 72 | 78 |
| lake-quote-pro.lovable.app | ai-built | 44 | 45 |
| meadow-mate-quotes.lovable.app | ai-built | 45 | 34 |
| lake-cumberland-builder.lovable.app | ai-built | 38 | 55 |
| michigan-weather-auth.lovable.app | ai-built | 38 | 42 |
| talk2-buy-ai.lovable.app | ai-built | 62 | 80 |
| lift-off.sh | ai-built | 28 | 12 |
| mymanagment.net | ai-built | 55 | 72 |
| webcam-tester.com | ai-built | 42 | 48 |
| ai-detective-spark.lovable.app | ai-built | 42 | 78 |
| chess-buddy-generator.lovable.app | ai-built | 34 | 32 |
| linear.app | crafted | 12 | 12 |
| stripe.com | crafted | 8 | 8 |
| vercel.com | crafted | 8 | 12 |
| granola.ai | crafted | 10 | 8 |
| arc.net | crafted | 8 | 12 |
| www.raycast.com | crafted | 12 | 12 |
| www.figma.com | crafted | 10 | 8 |
| www.apple.com | crafted | 4 | 4 |
| www.airbnb.com | crafted | 6 | 6 |
| www.aesop.com | crafted | blocked | blocked |
| teenage.engineering | crafted | 4 | 4 |
| mailchimp.com | crafted | 18 | 18 |
| posthog.com | crafted | 6 | 8 |
| basecamp.com | crafted | 8 | 10 |
| mercury.com | crafted | 8 | 8 |
| www.anthropic.com | crafted | 12 | 8 |
| www.notion.com | crafted | 12 | 12 |
| bluebottlecoffee.com | crafted | blocked | blocked |
| ramp.com | crafted | 12 | 12 |
| resend.com | crafted | 8 | 14 |
| www.lemonde.fr | crafted | 8 | 6 |
| salient.tailwindui.com | template | 42 | 42 |
| spotlight.tailwindui.com | template | 28 | 28 |
| example.com | template | 12 | 15 |
| pump.fun | edge | blocked | blocked |
| example.com/this-page-does-not-exist-dslop | edge | error | error |
| not a website | edge | error | error |
| this-domain-does-not-exist-dslop-bench.com | edge | error | - |
| github.com | crafted | 12 | 10 |