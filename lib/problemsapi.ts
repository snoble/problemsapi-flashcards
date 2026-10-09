// The server's side of the Problems API. The secret key never leaves this
// module; the browser gets only a pull's token and the publishable key.
import 'server-only';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import type { DeckSpec, Pull } from '@/lib/schemas';

export class ProblemsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const Env = z.object({
  PROBLEMS_API_SECRET_KEY: z.string().min(1),
  PROBLEMS_API_PUBLISHABLE_KEY: z.string().min(1),
  PROBLEMS_API_URL: z.url().default('https://api.problemsapi.com'),
});

function env() {
  const parsed = Env.safeParse({ ...process.env, PROBLEMS_API_URL: process.env.PROBLEMS_API_URL || undefined });
  if (!parsed.success) throw new ProblemsApiError(`The app's settings are incomplete: ${z.prettifyError(parsed.error)}`, 500);
  return parsed.data;
}

async function call<T extends z.ZodType>(path: string, body: unknown, schema: T): Promise<z.infer<T>> {
  const { PROBLEMS_API_SECRET_KEY, PROBLEMS_API_URL } = env();
  const response = await fetch(new URL(path, PROBLEMS_API_URL), {
    method: 'POST',
    headers: { authorization: `Bearer ${PROBLEMS_API_SECRET_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const answer: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const said = z.object({ message: z.string() }).safeParse(answer);
    throw new ProblemsApiError(`${path}: ${said.success ? said.data.message : `HTTP ${response.status}`}`, response.status);
  }
  return schema.parse(answer);
}

// Each deck's stream is copied from its shared ref, so every deploy runs the
// same program. Copying again changes nothing, so once per server process is enough.
const copied = new Map<string, Promise<unknown>>();
function ensureStream(deck: DeckSpec) {
  let ready = copied.get(deck.slug);
  if (!ready) {
    ready = call('/streams/from_ref', { ref: deck.ref, stream: deck.slug }, z.unknown()).catch((e) => {
      copied.delete(deck.slug);
      throw e;
    });
    copied.set(deck.slug, ready);
  }
  return ready;
}

// Each deck played is its own pull, so it has its own questions and its own budget of checks.
export async function newPull(deck: DeckSpec): Promise<Pull> {
  await ensureStream(deck);
  const key = `deck-${randomUUID()}`;
  const { pull } = await call('/pulls/create', { stream: deck.slug, key, count: deck.size }, z.object({ pull: z.object({ token: z.string() }) }));
  const { PROBLEMS_API_PUBLISHABLE_KEY, PROBLEMS_API_URL } = env();
  return { key, token: pull.token, publishableKey: PROBLEMS_API_PUBLISHABLE_KEY, apiUrl: PROBLEMS_API_URL };
}

// A number question's answer as written; a text question's answer is its text.
const Answered = z.discriminatedUnion('type', [
  z.object({ type: z.literal('number'), id: z.string(), answer_text: z.string() }).transform((q) => ({ id: q.id, answer: q.answer_text })),
  z.object({ type: z.literal('text'), id: z.string(), answer: z.string() }),
]);

// The answer to one card of a deck's pull, for a learner who gives up on it.
// The pull's key is a random name only the browser that played it was given.
export async function answerOf(deck: DeckSpec, key: string, question: string): Promise<string | null> {
  const { questions } = await call('/pulls/get', { stream: deck.slug, key }, z.object({ questions: z.array(Answered) }));
  return questions.find((q) => q.id === question)?.answer ?? null;
}
