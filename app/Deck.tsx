import Link from 'next/link';

import Flashcards from '@/app/Flashcards';
import { onlyDeck, viewOf } from '@/lib/decks';
import { newPull } from '@/lib/problemsapi';
import type { DeckSpec } from '@/lib/schemas';

// A deck's page, on the front page of a one-deck deploy or at /d/<slug>.
export default function Deck({ deck }: { deck: DeckSpec }) {
  // Started here and awaited in the browser, so "Start a deck" has it ready.
  const firstPull = newPull(deck).catch(() => null);
  return (
    <main>
      <p className="brand">
        Built on the <a href="https://problemsapi.com">Problems API</a>
        {!onlyDeck() && (
          <>
            {' · '}
            <Link href="/">All decks</Link>
          </>
        )}
      </p>
      <div className="intro">
        <h1>{deck.title}</h1>
        <p>{deck.intro}</p>
      </div>
      <Flashcards deck={viewOf(deck)} firstPull={firstPull} />
    </main>
  );
}
