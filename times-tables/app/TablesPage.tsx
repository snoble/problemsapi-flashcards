import Link from 'next/link';

import { DeckPage } from 'flashcards-core/pages';
import { firstPull } from 'flashcards-core/problemsapi';
import { type DeckSpec, DeckView } from 'flashcards-core/schemas';

import Tables from '@/app/Tables';
import { app } from '@/lib/flashcards';

// A deck's page, with links to the other decks after the brand.
export default function TablesPage({ deck }: { deck: DeckSpec }) {
  return (
    <DeckPage
      deck={deck}
      brand={app.decks
        .filter((d) => d.slug !== deck.slug)
        .map((d) => (
          <span key={d.slug}>
            {' · '}
            <Link href={app.path(d)}>{d.title}</Link>
          </span>
        ))}
    >
      <Tables deck={DeckView.parse(deck)} firstPull={firstPull(deck)} />
    </DeckPage>
  );
}
