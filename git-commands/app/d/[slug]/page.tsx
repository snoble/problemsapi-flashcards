import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';

import { DeckPage, deckMetadata } from 'flashcards-core/pages';
import { firstPull } from 'flashcards-core/problemsapi';
import { DeckView } from 'flashcards-core/schemas';

import Commands from '@/app/Commands';
import { app } from '@/lib/flashcards';

export async function generateMetadata({ params }: PageProps<'/d/[slug]'>): Promise<Metadata> {
  const deck = app.findDeck((await params).slug);
  return deck ? deckMetadata(deck) : {};
}

export default async function DeckRoute({ params }: PageProps<'/d/[slug]'>) {
  // Each visit makes its own first deck.
  await connection();
  const deck = app.findDeck((await params).slug);
  if (!deck) notFound();
  return (
    <DeckPage
      deck={deck}
      brand={
        <>
          {' · '}
          <Link href="/">All decks</Link>
        </>
      }
    >
      <Commands deck={DeckView.parse(deck)} firstPull={firstPull(deck)} />
    </DeckPage>
  );
}
