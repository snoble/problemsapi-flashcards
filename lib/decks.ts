// The decks this deploy serves, from FLASHCARD_DECKS: a JSON list of
// DeckSpec (lib/schemas.ts), each naming the shared ref of its stream.
// A deploy of one deck plays it on the front page; a deploy of several lists
// them there and plays each at /d/<slug>.
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

// The deploy's only deck, when it serves just one.
export function onlyDeck(): DeckSpec | null {
  const all = decks();
  return all.length === 1 ? all[0] : null;
}

export const deckPath = (deck: DeckSpec) => (onlyDeck() ? '/' : `/d/${encodeURIComponent(deck.slug)}`);
