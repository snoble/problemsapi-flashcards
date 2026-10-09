import Link from 'next/link';

import { Brand } from 'flashcards-core/pages';

import { app } from '@/lib/flashcards';

export default function Home() {
  return (
    <main>
      <Brand />
      <div className="intro">
        <h1>Git flashcards</h1>
        <p>Pick a deck. Each card describes a situation; type the command for it. The Problems API checks your answers.</p>
      </div>
      <ul className="decks">
        {app.decks.map((d) => (
          <li key={d.slug}>
            <Link href={app.path(d)}>
              <strong>{d.title}</strong>
              <span>{d.intro}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
