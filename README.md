# Daily Moment — take-home starter

This is the starting point for the Design Engineer take-home. Everything is set
up so you can spend your time on **design and product thinking**, not plumbing.

Please build on top of this. Don't start your own project from scratch — we use
the same scaffold for everyone so we can compare fairly, and so we can build on
your project together in the live session later.

## The one thing to build

The **main daily moment** of an app that helps someone stick with one daily goal
(you choose the goal). Build it in **`app/page.tsx`**. That one screen is the
whole task. Full brief is in the email we sent you.

## Run it (one command)

```bash
npm install && npm run dev
```

Then open <http://localhost:3000>. On desktop the app renders inside a phone-sized
frame on purpose — design for the phone, not the window. The page hot-reloads as
you edit.

> Node: use **Node 22** (there's an `.nvmrc`). Node 20 works locally too, but
> Vercel builds on 22.

## Deploy it (free)

Push your repo to GitHub, then import it at [vercel.com/new](https://vercel.com/new).
No environment variables, no config needed — it deploys as-is. Send us the live
link.

## What's inside

```
app/
  layout.tsx       Wraps your screen in the phone frame + sets mobile viewport
  page.tsx         ← YOUR CANVAS. Replace this with your daily moment.
  globals.css      Tailwind + a neutral base. Restyle freely.
components/
  PhoneFrame.tsx   Keeps the app phone-sized. Yours to restyle.
data/
  sample.json      Local sample data. Reshape it to fit your goal (keep it local).
lib/
  data.ts          Tiny typed loader for the sample data. No backend — this is it.
```

## The rules (from the brief)

- Start from this scaffold. Build the daily moment in `app/page.tsx`.
- **Mobile viewport only.** No desktop/tablet layouts, no edge/empty states.
- Read **`data/sample.json`** as a local file. **No backend, no database.**
- Deploy to a live link. Keep it **runnable with one command**.
- Plan for **~5 hours**. If you want to do more, write it down instead of building it.
- No real auth, no real payments (show where a paid feature would go).

## What to send back

1. The **live link**.
2. Your **repo** (this project, still one-command runnable).
3. A short **README section or Loom (< 5 min)**: what you looked at, what you
   chose and why, the one thing you're betting people get hooked on, and what
   you'd measure/test.
4. A note on **tools you used, including AI** (using AI well is a plus).

Questions as you go are welcome — asking a good one counts in your favor.
