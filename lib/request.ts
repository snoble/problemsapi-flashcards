// One JSON POST, parsed against a schema. Used by the browser (to this
// app's routes and the API's learner routes) and by the server (to the
// API with the secret key). A refusal becomes a RequestError whose message
// is a sentence a person can read.
import type { z } from 'zod';

import { Refusal } from './schemas';

export class RequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function postJson<S extends z.ZodType>(
  url: string | URL,
  body: unknown,
  schema: S,
  bearer?: string,
): Promise<z.infer<S>> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(bearer ? { authorization: `Bearer ${bearer}` } : {}) },
      body: JSON.stringify(body),
    });
  } catch {
    throw new RequestError('The service could not be reached. Check your connection and try again.', 0);
  }
  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const refusal = Refusal.safeParse(json);
    const said = refusal.success ? (refusal.data.error ?? refusal.data.message) : undefined;
    throw new RequestError(said ?? `Something went wrong (HTTP ${response.status}).`, response.status);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new RequestError('The service answered in a shape this page does not read.', 502);
  return parsed.data;
}

// An error caught in a `catch`, as a sentence.
export const messageOf = (e: unknown) => (e instanceof Error ? e.message : String(e));
