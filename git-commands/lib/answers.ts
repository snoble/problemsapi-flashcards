// A card's answer, read from its pull with the secret key, for a learner
// who gives up on it. The learner routes never give answers.
import 'server-only';
import { z } from 'zod';

import { call } from 'flashcards-core/problemsapi';
import type { DeckSpec } from 'flashcards-core/schemas';

// A number question's answer as written; a text question's answer is its text.
const Answered = z.discriminatedUnion('type', [
  z.object({ type: z.literal('number'), id: z.string(), answer_text: z.string() }).transform((q) => ({ id: q.id, answer: q.answer_text })),
  z.object({ type: z.literal('text'), id: z.string(), answer: z.string() }),
]);

// The pull's key is a random name only the browser that played it was given.
export async function answerOf(deck: DeckSpec, key: string, question: string): Promise<string | null> {
  const { questions } = await call('/pulls/get', { stream: deck.slug, key }, z.object({ questions: z.array(Answered) }));
  return questions.find((q) => q.id === question)?.answer ?? null;
}
