import type { z } from 'zod';

import { Refusal } from './schemas';

function refusal(status: number, body: unknown): string {
  const said = Refusal.safeParse(body);
  const text = said.success ? (said.data.error ?? said.data.message) : undefined;
  if (text) return text;
  if (status === 429) return 'This deck has used its checks for today. Start a new deck to keep going.';
  if (status === 503) return 'The service is busy. Try again in a moment.';
  return `Something went wrong (HTTP ${status}).`;
}

async function send<T extends z.ZodType>(schema: T, url: string, init?: RequestInit): Promise<z.infer<T>> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new Error('The service could not be reached. Check your connection and try again.');
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(refusal(response.status, body));
  return schema.parse(body);
}

export const get = <T extends z.ZodType>(schema: T, url: string) => send(schema, url);

export const post = <T extends z.ZodType>(schema: T, url: string, body: unknown, key?: string) =>
  send(schema, url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(key ? { authorization: `Bearer ${key}` } : {}) },
    body: JSON.stringify(body),
  });
