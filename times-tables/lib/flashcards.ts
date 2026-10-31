// The times-tables games: twelve cards each from the times tables up to
// 12 × 12. Each game plays at two paces, five seconds a card to race and
// thirty to learn, and each pace is a deck of its own with its own
// scoreboards. Times tables at five seconds plays on the front page and the
// others at /d/<slug>.
import 'server-only';

import { flashcards } from 'flashcards-core/app';
import type { DeckSpec } from 'flashcards-core/schemas';

const games = [
  {
    slug: 'times-tables',
    ref: '1Hg6VkCb9CoPFfx1Uj6rGAgVmxm5WazA',
    title: 'Times tables',
    intro: 'Each deck is 12 cards from the times tables up to 12 × 12. Type your answer and the API checks it.',
  },
  {
    slug: 'missing-factor',
    ref: 'swZ3FknTw4abFVX4eLPzWHPG6YMp9IO0',
    title: 'Missing factor',
    intro: 'Each card is a times-table fact with one factor missing, like 3 × _ = 18. Type the missing number and the API checks it.',
  },
  {
    slug: 'mixed',
    ref: '1yWPfAJbrLn7avcxgoGAb8p7ZQEzP_62',
    title: 'Mixed times tables',
    intro: 'Products and missing factors shuffled together, like 7 × 8 = and 3 × _ = 18. Type the missing number and the API checks it.',
  },
];

// Every deck is twelve cards typed on a number pad, and a right answer
// counts as soon as it is typed.
const deck = { size: 12, mistakeSeconds: 5, acceptTyped: true };

// Each game's two decks: racing keeps the game's slug, learning adds -learning.
const paces = games.map((g) => ({
  racing: { ...g, ...deck, cardSeconds: 5 },
  learning: { ...g, ...deck, slug: `${g.slug}-learning`, title: `${g.title} for learners`, cardSeconds: 30 },
}));

export const app = flashcards(
  paces.flatMap((p) => [p.racing, p.learning]),
  (d) => (d.slug === 'times-tables' ? '/' : `/d/${encodeURIComponent(d.slug)}`),
);

export const [timesTables] = app.decks;

type Pace = 'racing' | 'learning';
type Paced = { pace: Pace; twin: DeckSpec; others: DeckSpec[] };

function at(slug: string): DeckSpec {
  const found = app.findDeck(slug);
  if (!found) throw new Error(`no deck ${slug}`);
  return found;
}

// Each deck's pace, the same game at the other pace, and the other games at
// its pace, worked out once when the app loads.
const paced = new Map<string, Paced>(
  paces.flatMap((p) =>
    (['racing', 'learning'] as const).map((pace): [string, Paced] => {
      const twin = at(p[pace === 'racing' ? 'learning' : 'racing'].slug);
      const others = paces.filter((o) => o !== p).map((o) => at(o[pace].slug));
      return [p[pace].slug, { pace, twin, others }];
    }),
  ),
);

export function pacing(d: DeckSpec): Paced {
  const found = paced.get(d.slug);
  if (!found) throw new Error(`${d.slug} is not a times-tables deck`);
  return found;
}
