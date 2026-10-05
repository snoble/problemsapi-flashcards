import { notFound } from 'next/navigation';

import { findBoard } from '@/lib/boards';
import Join from './Join';

export default async function JoinPage({ params }: PageProps<'/join/[id]'>) {
  const { id } = await params;
  const board = await findBoard(id);
  if (!board) notFound();
  return (
    <main>
      <h1>Times tables flashcards</h1>
      <section className="panel">
        <p>You&apos;re invited to race on the {board.name} scoreboard.</p>
        <Join id={board.id} name={board.name} />
      </section>
    </main>
  );
}
