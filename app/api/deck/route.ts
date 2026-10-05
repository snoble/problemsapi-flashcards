import { ProblemsApiError, newDeck } from '../../../lib/problemsapi';

export const dynamic = 'force-dynamic';

// Decks per visitor: each is a pull in the account, so a visitor gets a
// few a minute. Kept in this server's memory, so it is a guard against a
// runaway page, not a hard limit across instances.
const WINDOW_MS = 60_000;
const DECKS_PER_WINDOW = 5;
const recent = new Map<string, number[]>();

function allowed(visitor: string, now: number): boolean {
  const kept = (recent.get(visitor) ?? []).filter((at) => now - at < WINDOW_MS);
  if (kept.length >= DECKS_PER_WINDOW) {
    recent.set(visitor, kept);
    return false;
  }
  recent.set(visitor, [...kept, now]);
  return true;
}

export async function POST(request: Request) {
  const visitor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!allowed(visitor, Date.now())) {
    return Response.json({ error: 'That is a lot of decks. Wait a minute, then start another.' }, { status: 429 });
  }
  try {
    return Response.json(await newDeck());
  } catch (e) {
    if (!(e instanceof ProblemsApiError)) throw e;
    console.error(`deck: ${e.message}`);
    const retry = e.status === 503 || e.status === 429;
    return Response.json(
      { error: retry ? 'The question service is busy. Try again in a moment.' : 'A deck could not be made just now.' },
      { status: retry ? 503 : 502 },
    );
  }
}
