import Link from 'next/link';

import { DeckPage } from 'flashcards-core/pages';
import { firstPull } from 'flashcards-core/problemsapi';
import { type DeckSpec, DeckView, secondsWord } from 'flashcards-core/schemas';

import Tables from '@/app/Tables';
import { app, pacing } from '@/lib/flashcards';

// A deck's page: links to the other games at its pace after the brand, and
// a link to the same game at the other pace above the deck.
export default function TablesPage({ deck }: { deck: DeckSpec }) {
  const { pace, twin, others } = pacing(deck);
  return (
    <DeckPage
      deck={deck}
      brand={others.map((d) => (
        <span key={d.slug}>
          {' · '}
          <Link href={app.path(d)}>{d.title}</Link>
        </span>
      ))}
    >
      <p className="pace">
        <Link href={app.path(twin)}>
          {pace === 'racing'
            ? `Just learning? Play at ${secondsWord(twin.cardSeconds)} a card, with scoreboards of its own.`
            : `Ready to race? Play at ${secondsWord(twin.cardSeconds)} a card.`}
        </Link>
      </p>
      <Tables deck={DeckView.parse(deck)} firstPull={firstPull(deck)} />
    </DeckPage>
  );
}
