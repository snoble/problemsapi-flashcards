import { connection } from 'next/server';

import { withCards, type Loaded } from '../lib/deck';
import { newDeck } from '../lib/problemsapi';
import Flashcards from './Flashcards';

async function firstDeck(): Promise<Loaded | null> {
  try {
    return await withCards(await newDeck());
  } catch (e) {
    console.error('first deck:', e);
    return null;
  }
}

export default async function Home() {
  await connection();
  const first = await firstDeck();
  return (
    <main>
      <p className="brand">
        Built on the <a href="https://problemsapi.com">Problems API</a>
      </p>
      <div className="intro">
        <h1>Times tables flashcards</h1>
        <p>Each deck is 12 cards from the times tables up to 12 × 12. Type your answer and the API checks it.</p>
      </div>
      <Flashcards first={first} />
    </main>
  );
}
