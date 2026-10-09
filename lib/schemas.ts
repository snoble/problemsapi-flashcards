import { z } from 'zod';

export const TOP = 10;
const DAY_MS = 24 * 3600 * 1000;

// Boards made, and boards a browser joined, before there were several decks
// are times-tables boards.
export const FIRST_DECK = 'times-tables';

export const json = <T extends z.core.$ZodType>(schema: T) =>
  z.codec(z.string(), schema, {
    decode: (text, ctx) => {
      try {
        return JSON.parse(text);
      } catch (e) {
        ctx.issues.push({ code: 'invalid_format', format: 'json', input: text, message: e instanceof Error ? e.message : String(e) });
        return z.NEVER;
      }
    },
    encode: (value) => JSON.stringify(value),
  });

const Answers = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('number') }),
  // The answer is the number of the right option, from 1 to `options`.
  z.object({ kind: z.literal('choice'), options: z.int().min(2).max(6) }),
  // The answer is typed words, such as a git command.
  z.object({ kind: z.literal('text') }),
]);

// What the browser knows about a deck. The server also knows its stream's ref.
export const DeckView = z.object({
  slug: z.string().min(1).max(60),
  title: z.string().min(1).max(60),
  intro: z.string().min(1).max(300),
  size: z.int().min(1).max(50),
  cardSeconds: z.int().min(1).max(120),
  mistakeSeconds: z.int().min(0).max(120),
  typeset: z.boolean(),
  answers: Answers,
});
export type DeckView = z.infer<typeof DeckView>;

export const DeckSpec = DeckView.extend({ ref: z.string().min(1) });
export type DeckSpec = z.infer<typeof DeckSpec>;

export const Decks = json(
  z
    .array(DeckSpec)
    .min(1)
    .refine((decks) => new Set(decks.map((d) => d.slug)).size === decks.length, 'Two decks share a slug.'),
);

export const BoardId = z.base64url().length(16);

export const Score = z.object({
  name: z.string(),
  ms: z.int(),
  mistakes: z.int(),
  at: z.int(),
});
export type Score = z.infer<typeof Score>;

export const Board = z.object({ id: BoardId, name: z.string(), deck: z.string(), scores: z.array(Score) });
export type Board = z.infer<typeof Board>;

export const NewBoard = z.object({
  name: z.string().trim().min(1, 'Give the board a name.').max(40, 'A board name is at most 40 characters.'),
  deck: z.string(),
});

export const NewScore = z.object({
  name: z.string().trim().min(1, 'Type your name.').max(24, 'A name is at most 24 characters.'),
  ms: z.int('A time is whole milliseconds.').positive().max(DAY_MS),
  mistakes: z.int('Mistakes are a whole number.').min(0).max(1000),
});

// `key` names the pull to the app's own server, which reveals a card's answer
// from it; the browser reads and checks the pull by its token.
export const Pull = z.object({ key: z.string(), token: z.string(), publishableKey: z.string(), apiUrl: z.url() });
export type Pull = z.infer<typeof Pull>;

export const Card = z.discriminatedUnion('type', [
  z.object({ type: z.literal('number'), id: z.string(), prompt: z.string(), latex: z.string().nullish() }),
  z.object({ type: z.literal('text'), id: z.string(), prompt: z.string() }),
]);
export type Card = z.infer<typeof Card>;

export const LearnerPull = z.object({ questions: z.array(Card) });

// A number mark's value is null when the answer could not be read as a number.
const Mark = z.discriminatedUnion('type', [
  z.object({ type: z.literal('number'), question: z.string(), correct: z.boolean(), value: z.unknown().nullish() }),
  z.object({ type: z.literal('text'), question: z.string(), correct: z.boolean() }),
]);

export const LearnerChecked = z.object({ marks: z.array(Mark) });

export const Revealed = z.object({ answer: z.string() });

export const Refusal = z.object({ error: z.string().optional(), message: z.string().optional() });

export const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

export const secondsWord = (n: number) => (n === 1 ? '1 second' : `${n} seconds`);
