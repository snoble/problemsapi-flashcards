// The times-tables decks: twelve cards each from the times tables up to
// 12 × 12, five seconds a card. Times tables plays on the front page and
// the others at /d/<slug>.
import 'server-only';

import { flashcards } from 'flashcards-core/app';

// Every deck is twelve cards typed on a number pad, five seconds a card.
const deck = { size: 12, cardSeconds: 5, mistakeSeconds: 5 };

export const app = flashcards(
  [
    {
      slug: 'times-tables',
      ref: '1Hg6VkCb9CoPFfx1Uj6rGAgVmxm5WazA',
      title: 'Times tables',
      intro: 'Each deck is 12 cards from the times tables up to 12 × 12. Type your answer and the API checks it.',
      ...deck,
    },
    {
      slug: 'missing-factor',
      ref: 'swZ3FknTw4abFVX4eLPzWHPG6YMp9IO0',
      title: 'Missing factor',
      intro: 'Each card is a times-table fact with one factor missing, like 3 × _ = 18. Type the missing number and the API checks it.',
      ...deck,
    },
    {
      slug: 'mixed',
      ref: '1yWPfAJbrLn7avcxgoGAb8p7ZQEzP_62',
      title: 'Mixed times tables',
      intro: 'Products and missing factors shuffled together, like 7 × 8 = and 3 × _ = 18. Type the missing number and the API checks it.',
      ...deck,
    },
  ],
  (d) => (d.slug === 'times-tables' ? '/' : `/d/${encodeURIComponent(d.slug)}`),
);

export const [timesTables] = app.decks;
