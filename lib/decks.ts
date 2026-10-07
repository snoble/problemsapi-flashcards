// The decks this deploy serves, from FLASHCARD_DECKS: a JSON list of
// DeckSpec (lib/schemas.ts), each naming the shared ref of its stream.
import 'server-only';
import { z } from 'zod';

import { Decks, DeckView, type DeckSpec } from '@/lib/schemas';

export function decks(): DeckSpec[] {
  const parsed = Decks.safeParse(process.env.FLASHCARD_DECKS ?? '');
  if (!parsed.success) throw new Error(`FLASHCARD_DECKS is not a list of decks: ${z.prettifyError(parsed.error)}`);
  return parsed.data;
}

export const findDeck = (slug: string): DeckSpec | null => decks().find((d) => d.slug === slug) ?? null;

export const viewOf = (deck: DeckSpec): DeckView => DeckView.parse(deck);
