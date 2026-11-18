// What the window says once a mended night's gold is laid: one line about falling and getting up,
// from a small hand-picked set, with whose it is. Each checked against its source (wording too:
// Keller wrote "full also of", and Goldsmith's line is usually misattributed to Confucius).

export type Quote = { text: string; by: string };

export const MEND_QUOTES: Quote[] = [
  { text: "The world breaks every one and afterward many are strong at the broken places.", by: "Ernest Hemingway, A Farewell to Arms" },
  { text: "There is a crack in everything. That's how the light gets in.", by: "Leonard Cohen, Anthem" },
  { text: "Although the world is full of suffering, it is full also of the overcoming of it.", by: "Helen Keller, Optimism" },
  { text: "Our greatest glory is not in never falling, but in rising every time we fall.", by: "Oliver Goldsmith, The Citizen of the World" },
  {
    text: "Courage doesn't always roar. Sometimes courage is the quiet voice at the end of the day saying, “I will try again tomorrow.”",
    by: "Mary Anne Radmacher",
  },
  { text: "Fall seven times, stand up eight.", by: "Japanese proverb" },
];

/** One of them, not the one shown last time. */
let last = -1;
export function mendQuote(): Quote {
  let i = Math.floor(Math.random() * MEND_QUOTES.length);
  if (i === last) i = (i + 1) % MEND_QUOTES.length;
  last = i;
  return MEND_QUOTES[i];
}
