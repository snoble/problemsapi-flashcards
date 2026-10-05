import { z } from 'zod';

export const TOP = 10;
export const MISTAKE_MS = 5000;
const DAY_MS = 24 * 3600 * 1000;

export const BoardId = z.base64url().length(16);

export const Score = z.object({
  name: z.string(),
  ms: z.int(),
  mistakes: z.int(),
  at: z.int(),
});
export type Score = z.infer<typeof Score>;

export const Board = z.object({ id: BoardId, name: z.string(), scores: z.array(Score) });
export type Board = z.infer<typeof Board>;

export const NewBoard = z.object({
  name: z.string().trim().min(1, 'Give the board a name.').max(40, 'A board name is at most 40 characters.'),
});

export const NewScore = z
  .object({
    name: z.string().trim().min(1, 'Type your name.').max(24, 'A name is at most 24 characters.'),
    ms: z.int('A time is whole milliseconds.').positive().max(DAY_MS),
    mistakes: z.int('Mistakes are a whole number.').min(0).max(1000),
  })
  .refine((s) => s.ms >= s.mistakes * MISTAKE_MS, 'That time is shorter than its mistakes.');

export const Deck = z.object({ token: z.string(), publishableKey: z.string(), apiUrl: z.url() });
export type Deck = z.infer<typeof Deck>;

export const Card = z.object({ id: z.string(), prompt: z.string(), latex: z.string().nullable() });
export type Card = z.infer<typeof Card>;

export const LearnerPull = z.object({ questions: z.array(Card) });

export const LearnerChecked = z.object({
  marks: z.array(z.object({ question: z.string(), correct: z.boolean(), value: z.unknown().nullable() })),
});

export const Refusal = z.object({ error: z.string().optional(), message: z.string().optional() });

export const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
