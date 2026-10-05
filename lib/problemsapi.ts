import 'server-only';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { postJson, RequestError } from './request';
import { Pulled, StreamSummary, type Deck } from './schemas';

// The stream is copied from PROBLEMS_API_STREAM_REF (from POST /streams/share),
// so every deploy runs the same program.
export const STREAM = 'times-table-facts';
export const DECK_SIZE = 12;

const Env = z.object({
  PROBLEMS_API_SECRET_KEY: z.string().min(1),
  PROBLEMS_API_PUBLISHABLE_KEY: z.string().min(1),
  PROBLEMS_API_STREAM_REF: z.string().min(1),
  PROBLEMS_API_URL: z.url().default('https://api.problemsapi.com'),
});

function settings() {
  const env = Env.safeParse({ ...process.env, PROBLEMS_API_URL: process.env.PROBLEMS_API_URL || undefined });
  if (!env.success) {
    const missing = env.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new RequestError(`The app's environment is not set up: ${missing}.`, 500);
  }
  return env.data;
}

function call<S extends z.ZodType>(path: string, body: unknown, schema: S) {
  const env = settings();
  return postJson(new URL(path, env.PROBLEMS_API_URL), body, schema, env.PROBLEMS_API_SECRET_KEY);
}

// A no-op when the stream already matches the ref; sent once per server process.
async function makeStream(): Promise<void> {
  await call('/streams/from_ref', { ref: settings().PROBLEMS_API_STREAM_REF, stream: STREAM }, StreamSummary);
}

let streamReady: Promise<void> | null = null;
function ensureStream(): Promise<void> {
  streamReady ??= makeStream().catch((e) => {
    streamReady = null;
    throw e;
  });
  return streamReady;
}

export async function newDeck(): Promise<Deck> {
  await ensureStream();
  const { pull } = await call('/pulls/create', { stream: STREAM, key: `deck-${randomUUID()}`, count: DECK_SIZE }, Pulled);
  if (!pull.token) throw new RequestError('the pull came back without a learner token', 502);
  const env = settings();
  return { token: pull.token, publishableKey: env.PROBLEMS_API_PUBLISHABLE_KEY, apiUrl: new URL(env.PROBLEMS_API_URL).origin };
}
