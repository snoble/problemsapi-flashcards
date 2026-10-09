// The times-tables deck: twelve cards from the times tables up to 12 × 12,
// five seconds a card, played on the front page.
import 'server-only';

import { flashcards } from 'flashcards-core/app';

export const app = flashcards(
  [
    {
      slug: 'times-tables',
      ref: '1Hg6VkCb9CoPFfx1Uj6rGAgVmxm5WazA',
      title: 'Times tables',
      intro: 'Each deck is 12 cards from the times tables up to 12 × 12. Type your answer and the API checks it.',
      size: 12,
      cardSeconds: 5,
      mistakeSeconds: 5,
    },
  ],
  () => '/',
);

export const [deck] = app.decks;
