# DSlop app

The Next.js app behind https://dslop.vercel.app. See the [main README](../README.md) for what it does and how to run it.

- `components/Unslop.tsx`: the whole flow (read, pick, build, edit, publish)
- `lib/scan.ts`: reads a site and finds the tells it can prove from the code
- `lib/claude.ts`: every call to Claude (analysis, live build, chat edits)
- `app/api/*`: analyze, directions (the market study and six directions), mock (each real first screen, streamed), talk (the chat while you pick), build (streamed), edit, publish, health
- `seldon.yml`: the two core workflows Seldon tests
