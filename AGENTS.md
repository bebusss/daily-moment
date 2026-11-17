# Take-home context for AI assistants

You're helping with a Design Engineer take-home. The task is to build the **main
daily moment** of a mobile app that helps someone stick with one daily goal.
Build it in `app/page.tsx`. Hold to these constraints:

- **Mobile viewport only.** No desktop/tablet layouts, no empty/edge states.
- **No backend, no database, no auth, no real payments.** Read local data from
  `data/sample.json` via `lib/data.ts`. That's the whole data layer.
- **Keep it small and runnable with one command** (`npm install && npm run dev`).
  It gets extended live later, so favor clear and extendable over clever.
- Design craft is what's being judged. Help the candidate execute their taste;
  don't impose a generic look.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
