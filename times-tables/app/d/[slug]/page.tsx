import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { connection } from 'next/server';

import { deckMetadata } from 'flashcards-core/pages';

import TablesPage from '@/app/TablesPage';
import { app, timesTables } from '@/lib/flashcards';

export async function generateMetadata({ params }: PageProps<'/d/[slug]'>): Promise<Metadata> {
  const deck = app.findDeck((await params).slug);
  return deck ? deckMetadata(deck) : {};
}

// The times-tables deck plays on the front page, so its old link leads there.
export default async function DeckRoute({ params }: PageProps<'/d/[slug]'>) {
  const deck = app.findDeck((await params).slug);
  if (!deck) notFound();
  if (deck.slug === timesTables.slug) redirect('/');
  // Each visit makes its own first deck.
  await connection();
  return <TablesPage deck={deck} />;
}
