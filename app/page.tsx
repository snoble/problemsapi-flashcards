import Link from 'next/link';
import { connection } from 'next/server';

import { decks } from '@/lib/decks';

export default async function Home() {
  await connection();
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
        {decks().map((deck) => (
          <li key={deck.slug}>
            <Link href={`/d/${encodeURIComponent(deck.slug)}`}>
              <strong>{deck.title}</strong>
              <span>{deck.intro}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
