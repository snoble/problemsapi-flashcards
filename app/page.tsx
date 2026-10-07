import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';

import Deck from '@/app/Deck';
import { deckPath, decks, onlyDeck } from '@/lib/decks';

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const deck = onlyDeck();
  return deck ? { title: `${deck.title} flashcards`, description: deck.intro } : {};
}

export default async function Home() {
  await connection();
  const deck = onlyDeck();
  if (deck) return <Deck deck={deck} />;
  return (
    <main>
      <p className="brand">
        Built on the <a href="https://problemsapi.com">Problems API</a>
      </p>
      <div className="intro">
        <h1>Flashcards</h1>
        <p>Pick a deck. The questions come from the Problems API, and it checks your answers.</p>
      </div>
      <ul className="decks">
        {decks().map((d) => (
          <li key={d.slug}>
            <Link href={deckPath(d)}>
              <strong>{d.title}</strong>
              <span>{d.intro}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
