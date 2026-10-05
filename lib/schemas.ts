import { z } from 'zod';

// `message` from the Problems API, `error` from this app's routes.
export const Refusal = z.object({ message: z.string().optional(), error: z.string().optional() });

export const Deck = z.object({
  token: z.string(),
  publishableKey: z.string(),
  apiUrl: z.url(),
});
export type Deck = z.infer<typeof Deck>;

export const Card = z.object({
  id: z.string(),
  prompt: z.string(),
  latex: z.string().nullable().optional(),
});
export type Card = z.infer<typeof Card>;
export const LearnerPull = z.object({ questions: z.array(Card) });

// `value` is null when the answer could not be read as a number.
export const Mark = z.object({
  question: z.string(),
  correct: z.boolean(),
  value: z.object({ numerator: z.int(), denominator: z.int() }).nullable(),
});
export const LearnerChecked = z.object({ marks: z.array(Mark) });

export const Pulled = z.object({ pull: z.object({ token: z.string().nullable() }) });

export const StreamSummary = z.object({ slug: z.string(), title: z.string(), revision: z.int() });
