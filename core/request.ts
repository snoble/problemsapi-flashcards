import type { z } from 'zod';

import { Refusal } from './schemas';

// What a learner reads when the service stayed busy through every retry.
export const BUSY = 'The service is busy. Try again in a moment.';

function refusal(status: number, body: unknown): string {
  const said = Refusal.safeParse(body);
  if (said.success && said.data.code === 'try_again') return BUSY;
  const text = said.success ? (said.data.error ?? said.data.message) : undefined;
  if (text) return text;
  if (status === 429) return 'This deck has used its checks for today. Start a new deck to keep going.';
  if (status === 503) return BUSY;
  return `Something went wrong (HTTP ${status}).`;
}

// A request the service refused or could not take, in words a learner can read.
export class Refused extends Error {}

// The Problems API answers 503 with `code: "try_again"` and a Retry-After
// when it could not settle a request just now, such as two pulls of one
// stream at once; sending the same request again is safe. Every call to it,
// from the server or the browser, goes through here and sends it again after
// Retry-After (capped, with jitter so two callers do not collide again), a
// few times, before giving the answer back.
export const RETRIES = 3;
const MAX_WAIT_MS = 5000;

const asksToRetry = async (response: Response) =>
  response.status === 503 && Refusal.safeParse(await response.clone().json().catch(() => null)).data?.code === 'try_again';

function waitFor(response: Response): number {
  const seconds = Number(response.headers.get('retry-after'));
  const base = Math.min(Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 1000, MAX_WAIT_MS);
  return base + Math.random() * (base / 4);
}

export async function fetchRetrying(url: string | URL, init?: RequestInit): Promise<Response> {
  for (let tries = 0; ; tries += 1) {
    const response = await fetch(url, init);
    if (tries === RETRIES || !(await asksToRetry(response))) return response;
    await new Promise((resolve) => setTimeout(resolve, waitFor(response)));
  }
}

async function send<T extends z.ZodType>(schema: T, url: string, init?: RequestInit): Promise<z.infer<T>> {
  let response: Response;
  try {
    response = await fetchRetrying(url, init);
  } catch {
    throw new Refused('The service could not be reached. Check your connection and try again.');
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Refused(refusal(response.status, body));
  return schema.parse(body);
}

export const get = <T extends z.ZodType>(schema: T, url: string) => send(schema, url);

export const post = <T extends z.ZodType>(schema: T, url: string, body: unknown, key?: string) =>
  send(schema, url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(key ? { authorization: `Bearer ${key}` } : {}) },
    body: JSON.stringify(body),
  });
