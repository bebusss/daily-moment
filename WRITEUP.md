# Daily Moment: my notes

## What I built

An evening wind-down. Each night of the month sets one piece of a stained-glass window, and tonight's piece is already waiting for you. Three light steps (the ritual, how heavy today was, an optional line) and it fills in.

## The bet

People stay when a habit becomes part of who they are. So every night is evidence, not a score.

The first missed night is where most people leave. A streak turns one miss into a reset. Here a missed night stays clear glass and light still passes through it. The night you come back sets a gold lead around it, so coming back is the one thing in the window that shines differently.

Why it fits the business: the subscription pays back around month three. A streak gets more fragile the longer it runs. A window gets more valuable. By month three you have three of them, with your own lines in them. That's what I'd expect people to miss.

## Inspiration

- **Kintsugi** was the spark, and I'd rather say so. The version native to glass is the mending lead: old cathedral windows still show the extra strips of lead that held cracked panes.
- **Cathedral glass at dusk** for the look: warm, uneven, lit from behind. I wanted it to feel like sitting in a dim room, not like reading a chart.
- **Forest, Pikmin Bloom and Duolingo** as the safe answers I expected most entries to land near. They work, but they reward the app's artifact, and they break when the streak breaks.
- **A psychologist friend** pressure-tested the idea, confirmed the core (a lapse should leave a mark you can recover from, never a reset) and pointed me to Nate Zinsser's E-S-P, which became the nightly line.

This month's window happens to be a vine, but the plant isn't the mechanism. The record is. Next month can be a rose window.

## Decisions

- **Tonight is preselected.** No choices at bedtime.
- **Heavier days set deeper glass.** Hard days count more, with no points.
- **No emotional copy.** The app never tells you who you are. It shows you what you did.
- **The breaths are paced on screen.** That's the step people skip when it's just a checkbox.
- **The line is E-S-P.** One optional line a night: an effort, a success or a bit of progress, and the person picks which. It's a bank of proof of what you can do (Bandura's self-efficacy), in your own words instead of an app's quotes.
- **The window comes to the night you open.** Tapping a night in the row moves the view in to its leaf. Setting tonight's leaf brings the view in while it fills with color, then steps back to the whole month.
- **Free REST API.** Open-Meteo gives tonight's sunset where you are, with no key and no location prompt. The phone's time zone names a city and the geocoder turns it into coordinates. Both calls share a three-second budget, and if they fail the sunset line just isn't there.
- **Paid feature.** Tap the month at the top to see next month's window. The lancet is free and the other designs are Plus. The ritual and your record are never behind the paywall: you pay for variety, never for your own evidence.

## What I'd measure

- **Lapse recovery, the main one:** share of people back within two days of their first missed night. It measures the exact moment this bet is supposed to win.
- **Day 7 and day 30 return.**
- **Month-3 retention**, by signup cohort.
- **A/B tests**, both judged on lapse recovery: a gold mend against a plain gap, to isolate the mechanic itself, and "Wind down tonight" against "Be someone who winds down", to isolate the framing.
- **On this screen:** where people drop off in the three steps, how many leave a line, and which of E, S or P they pick. Writing a line is a stronger sign of ownership than a tap.

## Not built, written down instead

- The sky behind the glass follows the real sunset: dusk, then night.
- Your intention, or your favorite color, sets the month's palette.
- A year view: twelve windows on one wall.
- A print of a finished window.
- Patterns from the heavy days ("heavy days cluster on Fridays"), as a gentle way to spot triggers.
- On the night someone comes back after a miss, an optional "what got in the way?", a light version of how CBT looks at a lapse.

## Tools

The scaffold's stack (Next.js 16, React 19, Tailwind v4), three.js through React Three Fiber for the window, and Open-Meteo for the sunset.

AI: Claude Code, as two agents working in parallel on the same repo. One built the window scene, the other the nightly flow and the UI, and each committed only its own files. I set the direction and judged every version on a phone screenshot. I threw out a flat SVG window, a rose window and a version that tilted with the mouse before this one. Both agents took Playwright screenshots at phone size after every change, so they checked what they built, not just whether it compiled.

## Run it

`npm install && npm run dev`, then open http://localhost:3000 at phone size.
