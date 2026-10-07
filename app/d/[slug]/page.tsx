import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';

import Flashcards from '@/app/Flashcards';
import { findDeck, viewOf } from '@/lib/decks';
import { newPull } from '@/lib/problemsapi';

export async function generateMetadata({ params }: PageProps<'/d/[slug]'>): Promise<Metadata> {
  const deck = findDeck((await params).slug);
  return deck ? { title: `${deck.title} flashcards`, description: deck.intro } : {};
}

export default async function DeckPage({ params }: PageProps<'/d/[slug]'>) {
  await connection();
  const deck = findDeck((await params).slug);
  if (!deck) notFound();
  // Started here and awaited in the browser, so "Start a deck" has it ready.
  const firstPull = newPull(deck).catch(() => null);
  return (
    <main>
      <p className="brand">
        Built on the <a href="https://problemsapi.com">Problems API</a> · <Link href="/">All decks</Link>
      </p>
      <div className="intro">
        <h1>{deck.title}</h1>
        <p>{deck.intro}</p>
      </div>
      <Flashcards deck={viewOf(deck)} firstPull={firstPull} />
    </main>
  );
}
