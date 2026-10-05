// The server's side of the Problems API, as a customer's back end uses it:
// the secret key never leaves this file's process. It copies the stream
// from a pinned ref once, and makes a fresh pull for every deck. The
// browser gets only the pull's token and the publishable key, which reach
// that pull's questions and its answer checks and nothing else.
import 'server-only';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { postJson, RequestError } from './request';
import { Pulled, StreamSummary, type Deck } from './schemas';

// The stream this app pulls from. Its definition and program come from a
// ref (PROBLEMS_API_STREAM_REF) that POST /streams/share answered for a
// stream designed in problemsapi's chat, so every deploy runs the same
// program: times tables up to 12 x 12, each prompt written as "7 × 8 =".
// Changing the stream means sharing a new revision and setting its ref.
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

// Copy the pinned stream into this account. The API changes nothing when
// the stream already has the ref's definition and program, so each server
// process sends it once; no model is called.
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

// A new deck: a pull under a key no other deck uses, so it has its own
// questions and its own budget of answer checks.
export async function newDeck(): Promise<Deck> {
  await ensureStream();
  const { pull } = await call('/pulls/create', { stream: STREAM, key: `deck-${randomUUID()}`, count: DECK_SIZE }, Pulled);
  if (!pull.token) throw new RequestError('the pull came back without a learner token', 502);
  const env = settings();
  return { token: pull.token, publishableKey: env.PROBLEMS_API_PUBLISHABLE_KEY, apiUrl: new URL(env.PROBLEMS_API_URL).origin };
}
