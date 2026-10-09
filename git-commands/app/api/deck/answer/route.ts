import { z } from 'zod';

import { ProblemsApiError } from 'flashcards-core/problemsapi';

import { answerOf } from '@/lib/answers';
import { app } from '@/lib/flashcards';

const Wanted = z.object({ deck: z.string(), key: z.string().min(1), question: z.string().min(1) });

export async function POST(request: Request) {
  const wanted = Wanted.safeParse(await request.json().catch(() => null));
  const deck = wanted.success ? app.findDeck(wanted.data.deck) : null;
  if (!wanted.success || !deck) return Response.json({ error: 'That card does not exist.' }, { status: 404 });
  try {
    const answer = await answerOf(deck, wanted.data.key, wanted.data.question);
    if (answer === null) return Response.json({ error: 'That card does not exist.' }, { status: 404 });
    return Response.json({ answer });
  } catch (e) {
    if (!(e instanceof ProblemsApiError)) throw e;
    console.error(`answer ${deck.slug}: ${e.message}`);
    if (e.status === 404) return Response.json({ error: 'That card does not exist.' }, { status: 404 });
    return Response.json({ error: 'The answer could not be fetched just now. Try again in a moment.' }, { status: 503 });
  }
}
