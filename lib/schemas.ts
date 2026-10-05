// The shapes this app reads from the Problems API and from its own routes,
// as Zod schemas: every response is parsed against one, so the types the
// code uses are the types that were checked at the boundary.
import { z } from 'zod';

// A refusal from the API (`message`) or from this app's routes (`error`).
export const Refusal = z.object({ message: z.string().optional(), error: z.string().optional() });

// What /api/deck hands the browser: one pull's token and the publishable
// key that, with it, reaches that pull and nothing else.
export const Deck = z.object({
  token: z.string(),
  publishableKey: z.string(),
  apiUrl: z.url(),
});
export type Deck = z.infer<typeof Deck>;

// POST /learner/pull: a pull's questions, never their answers.
export const Card = z.object({
  id: z.string(),
  prompt: z.string(),
  latex: z.string().nullable().optional(),
});
export type Card = z.infer<typeof Card>;
export const LearnerPull = z.object({ questions: z.array(Card) });

// POST /learner/check: one mark per answer. `value` is the number the
// answer was read as, or null when it could not be read.
export const Mark = z.object({
  question: z.string(),
  correct: z.boolean(),
  value: z.object({ numerator: z.int(), denominator: z.int() }).nullable(),
});
export type Mark = z.infer<typeof Mark>;
export const LearnerChecked = z.object({ marks: z.array(Mark) });

// POST /pulls/create, as far as this app reads it.
export const Pulled = z.object({ pull: z.object({ token: z.string().nullable() }) });

// POST /streams/from_ref: the stream copied into this account.
export const StreamSummary = z.object({ slug: z.string(), title: z.string(), revision: z.int() });
