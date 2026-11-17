# Mobile-first Design Engineer — Take-home

Thanks for getting this far. This is the part we care about most — it's how we see
how you actually work. It's small on purpose, and we pay you for your time.

**We'll pay you $50 for this, whatever the outcome. Your work stays yours.**

Everything you need is in this repo. Clone it, read this README, and build.

## In one sentence

Design and build one small app that helps someone reach a daily goal, deploy it to
a link we can open, and tell us why you made the choices you made.

## What we give you (this repo)

A **Next.js** app that already runs and already deploys. It includes Tailwind,
TypeScript, a sample data file, and one blank screen for you to build on. Setup is
done for you, so you can spend your time on design and product thinking.

Please start from this project — don't rebuild it from scratch. We use the same
starting point for everyone so we can compare fairly, and so we can build on your
project together later (see "What happens next").

See [**Run it**](#run-it-one-command) below to get going in one command.

## Your task

Build the **main daily moment** of an app that helps someone stick with one daily
goal.

The main daily moment is the screen where a person does the thing each day, marks
it done, and gets a small, satisfying sense of progress that makes them want to
come back tomorrow. That one moment is the whole task — you don't need to build the
rest of the app. Build it in **`app/page.tsx`**.

**You choose what the goal is.** Some examples:

- learning a little every day (a language, vocabulary, an instrument)
- saving money toward something
- winding down for better sleep
- a small creative habit (write 100 words, take one photo)

If you have a better idea, use it. We want to see what you choose and why.

## Where to be creative, and where to follow exactly

We're testing two different things at once. Please keep them straight.

**You decide these. Be creative. There's no "right" answer:**

- what daily goal your app is about
- what the daily moment looks like and how it feels
- the layout, the words, the color, the type, any motion
- the one thing that makes people want to come back (the most important design
  decision you'll make)

**You must follow these exactly. These are not optional:**

1. Start from this scaffold. Don't rebuild the project yourself.
2. Design **mobile-first** — we open and judge it on a phone. Making it responsive
   so it also looks good on desktop is welcome, but it's your call.
3. Your app must read the **sample data file** (`data/sample.json`). Change the
   contents to fit your goal, but keep it a local file. **No backend.**
4. **Deploy it** to a link we can open in a browser.
5. Keep the project **runnable with one command**, because we build on it together
   later.
6. Plan for **about 5 hours**. Please don't go over. If you want to do more, write
   it down instead of building it.
7. Send everything in the ["What to send back"](#what-to-send-back) list below.

If anything here is unclear, email us before you start. Asking a good question is a
point in your favor, not against you.

## The business reality to design around

Your design should serve this. It's the thing we most want to see you understand.

> This kind of app only makes money as a subscription. We don't earn anything on a
> user until they've stayed about **three billing cycles**, and it really pays off
> at **five or more**. People don't stay because we remind them or make them feel
> guilty. They stay because they get genuinely hooked on one core thing early,
> something they'd miss if it disappeared.

So: pick the one thing you believe people would get hooked on, and design the daily
moment around it. Most of your choices should trace back to "this helps someone
stick around long enough to matter." Tell us where you're placing that bet.

## Run it (one command)

```bash
npm install && npm run dev
```

Then open <http://localhost:3000>. The page hot-reloads as you edit.

> Node: use **Node 22** (there's an `.nvmrc`). Node 20 works locally too, but Vercel
> builds on 22.

## Deploy it (free)

Push your clone to your own GitHub, then import it at
[vercel.com/new](https://vercel.com/new). No environment variables, no config — it
deploys as-is. Send us the live link.

## What's inside this repo

```
app/
  layout.tsx       Root layout + mobile viewport. Fonts are a neutral default.
  page.tsx         ← YOUR CANVAS. Replace this with your daily moment.
  globals.css      Tailwind + a neutral base. Restyle freely.
data/
  sample.json      Local sample data. Reshape it to fit your goal (keep it local).
lib/
  data.ts          Tiny typed loader for the sample data. No backend — this is it.
```

## What to send back

1. A **live link** to your deployed app. It must open on a phone-sized screen and
   read the sample data.
2. Your **project** (your clone of this scaffold), still runnable with one command.
3. A short **README note, or a Loom video under 5 minutes**, that covers:
   - what you **looked at** before you designed (apps, patterns, references)
   - what you **chose and why**: your goal, your design, and the one thing you're
     betting people get hooked on
   - what you'd **measure** to know it worked, one thing you'd **test**, and what
     moves (people staying, or money) if it works
4. A quick note on **what tools you used, including AI**. Using AI well is a plus
   here. We hope you do.

## What you do NOT need to do

Please don't spend time on any of this. It won't earn you points, and skipping it
is the right call.

- No backend and no hosted database. Use the local data file.
- No real sign-in or user accounts.
- No real payments. Show us where a paid feature would go and what it would unlock,
  but don't connect Stripe or anything like it.
- No empty states or rare edge cases. Just make the main daily moment work well.
- No extra hours to make it bigger. A small, clean, working thing beats a big,
  fragile one.

## What happens next

If we move forward, we'll do a short live session together where we **build on this
same project**. That's why we ask you to keep it runnable and easy to extend.
Something small and alive beats something large and fragile.

Separately, we'll send you a short online **reasoning exercise (about 15 minutes)**.
It's not part of the build and doesn't count toward your 5 hours — do it whenever
you like.

## How we'll judge it

- **Design quality, UI and UX (the big one).** Is it clear, usable, and genuinely
  nice to use on a phone? Practical beats fancy.
- **A real design system, not random styling.** Consistent, reusable, intentional.
- **Your product bet.** Did your goal and your "hook" serve the retention reality
  above?
- **Creativity.** Did you make an interesting choice and make a simple idea feel
  fresh?
- **It ships.** Deployed, opens on a phone, reads the data, runs for us.
- **Clear communication.** Can we run it and understand your thinking from what you
  sent?
- **Research instinct.** Did you look before you leaped?

Questions as you go are welcome. Have fun with it.
