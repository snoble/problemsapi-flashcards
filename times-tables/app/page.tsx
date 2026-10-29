import type { Metadata } from 'next';
import { connection } from 'next/server';

import { deckMetadata } from 'flashcards-core/pages';

import TablesPage from '@/app/TablesPage';
import { timesTables } from '@/lib/flashcards';

export const metadata: Metadata = deckMetadata(timesTables);

export default async function Home() {
  // Each visit makes its own first deck.
  await connection();
  return <TablesPage deck={timesTables} />;
}
