import { z } from 'zod';

import { findDeck } from '@/lib/decks';
import { ProblemsApiError, newPull } from '@/lib/problemsapi';

const Wanted = z.object({ deck: z.string() });

export async function POST(request: Request) {
  const wanted = Wanted.safeParse(await request.json().catch(() => null));
  const deck = wanted.success ? findDeck(wanted.data.deck) : null;
  if (!deck) return Response.json({ error: 'That deck does not exist.' }, { status: 404 });
  try {
    return Response.json(await newPull(deck));
  } catch (e) {
    if (!(e instanceof ProblemsApiError)) throw e;
    console.error(`deck ${deck.slug}: ${e.message}`);
    const retry = e.status === 503 || e.status === 429;
    return Response.json(
      { error: retry ? 'The question service is busy. Try again in a moment.' : 'A deck could not be made just now.' },
      { status: retry ? 503 : 502 },
    );
  }
}
