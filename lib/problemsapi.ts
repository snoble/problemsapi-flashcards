// The server's side of the Problems API. The secret key never leaves this
// module; the browser gets only a pull's token and the publishable key.
import 'server-only';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import type { Deck } from '@/lib/schemas';

const STREAM = 'times-table-facts';
const DECK_SIZE = 12;

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
  PROBLEMS_API_STREAM_REF: z.string().min(1),
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

// The stream is copied from a shared ref, so every deploy runs the same
// program. Copying again changes nothing, so once per server process is enough.
let streamReady: Promise<unknown> | null = null;
function ensureStream() {
  streamReady ??= call('/streams/from_ref', { ref: env().PROBLEMS_API_STREAM_REF, stream: STREAM }, z.unknown()).catch((e) => {
    streamReady = null;
    throw e;
  });
  return streamReady;
}

// Each deck is its own pull, so it has its own questions and its own budget of checks.
export async function newDeck(): Promise<Deck> {
  await ensureStream();
  const { pull } = await call(
    '/pulls/create',
    { stream: STREAM, key: `deck-${randomUUID()}`, count: DECK_SIZE },
    z.object({ pull: z.object({ token: z.string() }) }),
  );
  const { PROBLEMS_API_PUBLISHABLE_KEY, PROBLEMS_API_URL } = env();
  return { token: pull.token, publishableKey: PROBLEMS_API_PUBLISHABLE_KEY, apiUrl: PROBLEMS_API_URL };
}
