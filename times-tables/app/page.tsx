import type { Metadata } from 'next';
import { connection } from 'next/server';

import { DeckPage, deckMetadata } from 'flashcards-core/pages';
import { firstPull } from 'flashcards-core/problemsapi';
import { DeckView } from 'flashcards-core/schemas';

import Tables from '@/app/Tables';
import { deck } from '@/lib/flashcards';

export const metadata: Metadata = deckMetadata(deck);

export default async function Home() {
  // Each visit makes its own first deck.
  await connection();
  return (
    <DeckPage deck={deck}>
      <Tables deck={DeckView.parse(deck)} firstPull={firstPull(deck)} />
    </DeckPage>
  );
}
