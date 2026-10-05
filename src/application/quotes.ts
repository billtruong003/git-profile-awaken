import type { Quote } from '../domain/types.js';

/** Short, widely quoted lines about building software. */
export const BUILTIN_QUOTES: readonly Quote[] = [
  { text: 'Talk is cheap. Show me the code.', author: 'Linus Torvalds' },
  { text: 'Programs must be written for people to read, and only incidentally for machines to execute.', author: 'Harold Abelson' },
  { text: 'Simplicity is prerequisite for reliability.', author: 'Edsger W. Dijkstra' },
  { text: 'Premature optimization is the root of all evil.', author: 'Donald Knuth' },
  { text: 'First, solve the problem. Then, write the code.', author: 'John Johnson' },
  { text: 'Make it work, make it right, make it fast.', author: 'Kent Beck' },
  { text: 'Any fool can write code that a computer can understand. Good programmers write code that humans can understand.', author: 'Martin Fowler' },
  { text: 'The best way to predict the future is to invent it.', author: 'Alan Kay' },
  { text: 'Simple things should be simple, complex things should be possible.', author: 'Alan Kay' },
  { text: 'Debugging is twice as hard as writing the code in the first place.', author: 'Brian Kernighan' },
  { text: 'There are only two hard things in computer science: cache invalidation and naming things.', author: 'Phil Karlton' },
  { text: 'Walking on water and developing software from a specification are easy if both are frozen.', author: 'Edward V. Berard' },
  { text: 'Code is like humor. When you have to explain it, it is bad.', author: 'Cory House' },
  { text: 'Deleted code is debugged code.', author: 'Jeff Sickel' },
  { text: 'If it hurts, do it more often.', author: 'Martin Fowler' },
  { text: 'Weeks of coding can save you hours of planning.', author: 'Unknown' },
  { text: 'The most disastrous thing that you can ever learn is your first programming language.', author: 'Alan Kay' },
  { text: 'Testing shows the presence, not the absence of bugs.', author: 'Edsger W. Dijkstra' },
  { text: 'Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.', author: 'Antoine de Saint-Exupéry' },
  { text: 'A ship in port is safe, but that is not what ships are built for.', author: 'Grace Hopper' },
  { text: 'It is easier to ask forgiveness than it is to get permission.', author: 'Grace Hopper' },
  { text: 'Before software can be reusable it first has to be usable.', author: 'Ralph Johnson' },
  { text: 'Programming is the art of algorithm design and the craft of debugging errant code.', author: 'Ellen Ullman' },
  { text: 'Fix the cause, not the symptom.', author: 'Steve Maguire' },
  { text: 'One of my most productive days was throwing away 1,000 lines of code.', author: 'Ken Thompson' },
  { text: 'When in doubt, use brute force.', author: 'Ken Thompson' },
  { text: 'Every great developer you know got there by solving problems they were unqualified to solve until they actually did it.', author: 'Patrick McKenzie' },
  { text: 'The function of good software is to make the complex appear to be simple.', author: 'Grady Booch' },
  { text: 'Optimism is an occupational hazard of programming; feedback is the treatment.', author: 'Kent Beck' },
  { text: 'Software is a great combination of artistry and engineering.', author: 'Bill Gates' },
];

const dayNumber = (iso: string): number => Math.floor(Date.parse(iso) / 864e5);

const hash = (s: string): number => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};

/** One quote per day, offset by the player's name so neighbouring profiles do not show the same line. */
export const quoteOfTheDay = (quotes: readonly Quote[], login: string, nowIso: string): Quote | null =>
  quotes.length ? quotes[(dayNumber(nowIso) + hash(login.toLowerCase())) % quotes.length]! : null;
