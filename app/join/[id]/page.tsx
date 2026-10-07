import { notFound } from 'next/navigation';

import { findBoard } from '@/lib/boards';
import { findDeck } from '@/lib/decks';
import Join from './Join';

export default async function JoinPage({ params }: PageProps<'/join/[id]'>) {
  const board = await findBoard((await params).id);
  const deck = board && findDeck(board.deck);
  if (!board || !deck) notFound();
  return (
    <main>
      <h1>{deck.title} flashcards</h1>
      <section className="panel">
        <p>You&apos;re invited to race on the {board.name} scoreboard.</p>
        <Join id={board.id} name={board.name} deck={deck.slug} />
      </section>
    </main>
  );
}
