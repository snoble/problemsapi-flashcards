import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { connection } from 'next/server';

import Deck from '@/app/Deck';
import { deckPath, findDeck } from '@/lib/decks';

export async function generateMetadata({ params }: PageProps<'/d/[slug]'>): Promise<Metadata> {
  const deck = findDeck((await params).slug);
  return deck ? { title: `${deck.title} flashcards`, description: deck.intro } : {};
}

export default async function DeckPage({ params }: PageProps<'/d/[slug]'>) {
  await connection();
  const deck = findDeck((await params).slug);
  if (!deck) notFound();
  if (deckPath(deck) === '/') redirect('/');
  return <Deck deck={deck} />;
}
