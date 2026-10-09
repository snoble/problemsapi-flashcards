// The pages every flashcards app shares: a deck's page around the app's own
// flashcards, an invite link, and the not-found pages.
import 'server-only';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import type { Flashcards } from './app';
import { findBoard } from './boards';
import Join from './Join';
import type { DeckView } from './schemas';

export const deckMetadata = (deck: DeckView): Metadata => ({ title: `${deck.title} flashcards`, description: deck.intro });

// "Built on the Problems API", and whatever links an app adds after it.
export const Brand = ({ children }: { children?: ReactNode }) => (
  <p className="brand">
    Built on the <a href="https://problemsapi.com">Problems API</a>
    {children}
  </p>
);

// A deck's page: its title and intro above the app's flashcards.
export function DeckPage({ deck, brand, children }: { deck: DeckView; brand?: ReactNode; children: ReactNode }) {
  return (
    <main>
      <Brand>{brand}</Brand>
      <div className="intro">
        <h1>{deck.title}</h1>
        <p>{deck.intro}</p>
      </div>
      {children}
    </main>
  );
}

// /join/<id>: a board's invite link.
export async function JoinPage({ app, id }: { app: Flashcards; id: string }) {
  const board = await findBoard(id);
  const deck = board && app.findDeck(board.deck);
  if (!board || !deck) notFound();
  return (
    <main>
      <h1>{deck.title} flashcards</h1>
      <section className="panel">
        <p>You&apos;re invited to race on the {board.name} scoreboard.</p>
        <Join id={board.id} name={board.name} deck={deck.slug} href={app.path(deck)} />
      </section>
    </main>
  );
}

export function NoSuchDeck() {
  return (
    <main>
      <h1>There is no such deck</h1>
      <p>
        <Link href="/">See the decks</Link>.
      </p>
    </main>
  );
}

export function NoSuchBoard() {
  return (
    <main>
      <h1>That board does not exist</h1>
      <p>
        Check the invite link, or <Link href="/">make a board of your own</Link>.
      </p>
    </main>
  );
}
