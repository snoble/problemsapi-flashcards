// The server's side of the Problems API, as a customer's back end uses it:
// the secret key never leaves this file's process. It copies the stream
// from a pinned ref once, and makes a fresh pull for every deck. The
// browser gets only the pull's token and the publishable key, which reach
// that pull's questions and its answer checks and nothing else.
import 'server-only';
import { randomUUID } from 'node:crypto';

// The stream this app pulls from. Its definition and program come from a
// ref (PROBLEMS_API_STREAM_REF) that POST /streams/share answered for a
// stream designed in problemsapi's chat, so every deploy runs the same
// program: times tables up to 12 x 12, each prompt written as "7 × 8 =".
// Changing the stream means sharing a new revision and setting its ref.
export const STREAM = 'times-table-facts';
export const DECK_SIZE = 12;

export class ProblemsApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function settings() {
  const secret = process.env.PROBLEMS_API_SECRET_KEY;
  const publishable = process.env.PROBLEMS_API_PUBLISHABLE_KEY;
  const ref = process.env.PROBLEMS_API_STREAM_REF;
  if (!secret || !publishable || !ref) {
    throw new ProblemsApiError('The app is missing PROBLEMS_API_SECRET_KEY, PROBLEMS_API_PUBLISHABLE_KEY or PROBLEMS_API_STREAM_REF.', 500);
  }
  return { secret, publishable, ref, url: (process.env.PROBLEMS_API_URL || 'https://api.problemsapi.com').replace(/\/$/, '') };
}

async function call<T>(path: string, body: unknown): Promise<T> {
  const { secret, url } = settings();
  const response = await fetch(url + path, {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const answer = await response.json().catch(() => null);
  if (!response.ok) {
    const message = answer && typeof answer.message === 'string' ? answer.message : `HTTP ${response.status}`;
    throw new ProblemsApiError(`${path}: ${message}`, response.status);
  }
  return answer as T;
}

// Copy the pinned stream into this account. The API changes nothing when
// the stream already has the ref's definition and program, so each server
// process sends it once; no model is called.
async function makeStream(): Promise<void> {
  await call('/streams/from_ref', { ref: settings().ref, stream: STREAM });
}

let streamReady: Promise<void> | null = null;
function ensureStream(): Promise<void> {
  streamReady ??= makeStream().catch((e) => {
    streamReady = null;
    throw e;
  });
  return streamReady;
}

export type Deck = { token: string; publishableKey: string; apiUrl: string };

// A new deck: a pull under a key no other deck uses, so it has its own
// questions and its own budget of answer checks.
export async function newDeck(): Promise<Deck> {
  await ensureStream();
  const { pull } = await call<{ pull: { token: string | null } }>('/pulls/create', {
    stream: STREAM,
    key: `deck-${randomUUID()}`,
    count: DECK_SIZE,
  });
  if (!pull.token) throw new ProblemsApiError('the pull came back without a learner token', 502);
  const { publishable, url } = settings();
  return { token: pull.token, publishableKey: publishable, apiUrl: url };
}
