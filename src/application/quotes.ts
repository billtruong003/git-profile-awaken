import type { Quote, QuoteSetting } from '../domain/types.js';

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

/** Dry developer jokes, the kind you have to think about for a second. Pick them with "quotes": "dry". */
export const DRY_QUOTES: readonly Quote[] = [
  { text: 'Four years of computer science, and my job is pressing Accept on what the AI wrote.', author: 'a graduate, 2026' },
  { text: 'I named a variable temp in 2019. It has outlived two of my side projects.', author: 'a senior dev' },
  { text: 'The code works. Nobody may know why, including me.', author: 'the author' },
  { text: 'Our tests pass every time. We only run the ones that pass.', author: 'QA, off the record' },
  { text: 'I asked for a 10x engineer. They sent ten engineers and one meeting.', author: 'a startup founder' },
  { text: 'Legacy code: written by someone braver, maintained by someone wiser. Both were me.', author: 'git blame' },
  { text: 'My commit says small fix. The diff says four thousand lines.', author: 'code review' },
  { text: 'Senior: has seen this exact bug before and still cannot remember the fix.', author: 'a senior dev' },
  { text: "I don't need therapy. I have git blame, and it is always me.", author: 'a developer' },
  { text: 'We are agile: we change direction every two weeks without moving.', author: 'the sprint board' },
  { text: 'The documentation is complete. It says TODO: write docs.', author: 'the README' },
  { text: 'I fixed the bug by deleting the feature. The client calls it scope.', author: 'a product manager' },
  { text: 'I optimized the loop from 3 ms to 2 ms. It runs once a year.', author: 'a performance engineer' },
  { text: 'Code review: three approvals, zero people opened the file.', author: 'the pull request' },
  { text: 'I spent six hours automating a five-minute task. I break even in 2031.', author: 'an automation fan' },
  { text: 'The AI wrote the code, the AI wrote the tests, and I wrote the apology.', author: 'the on-call engineer' },
  { text: 'Production is the best test environment. It has the most testers.', author: 'nobody, in writing' },
  { text: "I don't fear deadlines. I fear the day after, when someone reads my code.", author: 'a developer' },
  { text: 'Our microservices talk to each other more than our teams do.', author: 'the architecture diagram' },
  { text: 'Game dev is 90% moving a button two pixels and the other 90% waiting for the build.', author: 'a Unity developer' },
  { text: 'Shaders are easy. You change one line and the GPU stays silent for an hour.', author: 'a technical artist' },
  { text: 'I built a VR game so I could finally face my bugs in person.', author: 'a VR developer' },
  { text: "The frame rate dropped, so I lowered the player's expectations instead.", author: 'a performance pass' },
  { text: 'Every multiplayer bug is a single-player bug with witnesses.', author: 'the netcode' },
  { text: 'Prompt engineering: learning to say please to a compiler.', author: 'a modern developer' },
  { text: 'Rubber duck debugging works. The duck just bills less than a consultant.', author: 'the duck' },
  { text: 'My code is self-documenting. It documents how tired I was.', author: 'a developer at 2 a.m.' },
  { text: 'The meeting could have been an email. The email could have been a commit.', author: 'a developer' },
  { text: 'Exceptions are like relatives: catch one and three more show up.', author: 'a stack trace' },
  { text: 'Deploy on Friday and the weekend becomes a live-service game.', author: 'the on-call rota' },
  { text: 'It works on my machine, so we ship my machine. That is a container.', author: 'DevOps folklore' },
  { text: 'Version 2.0 is version 1.0 with the bugs we learned to love.', author: 'the changelog' },
  { text: "I don't write bugs. I write surprise features with a short shelf life.", author: 'a developer' },
  { text: 'The estimate was two days. It still is, every day.', author: 'the ticket' },
  { text: 'We hired a 10x developer. Now the codebase is ten times larger.', author: 'the tech lead' },
  { text: 'I comment my code so future me knows exactly who to blame.', author: 'past me' },
  { text: 'Clean code is code nobody has needed to change yet.', author: 'a maintainer' },
  { text: 'The intern deleted production. The postmortem says we lacked a process. We lacked an intern.', author: 'an incident report' },
  { text: 'Machine learning: if statements, but you are not allowed to read them.', author: 'a data scientist' },
  { text: 'My GPU is rendering the scene. My CPU is rendering my anxiety.', author: 'the profiler' },
];

const POOLS = { builtin: BUILTIN_QUOTES, dry: DRY_QUOTES } as const;

/** The quotes a player rotates through: a bundled pool, their own list, or both mixed. */
export const quotePool = (quotes: QuoteSetting): readonly Quote[] =>
  typeof quotes === 'string' ? POOLS[quotes] : quotes.flatMap((q) => (typeof q === 'string' ? POOLS[q] : [q]));
