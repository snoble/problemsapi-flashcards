// The git decks: each card describes a situation and asks for the git or gh
// command for it. The front page lists them, and each plays at /d/<slug>.
import 'server-only';

import { flashcards } from 'flashcards-core/app';

// Every deck is eight typed commands, twenty seconds a card.
const deck = { size: 8, cardSeconds: 20, mistakeSeconds: 5 };

export const app = flashcards(
  [
    {
      slug: 'git-everyday',
      ref: 'g-AdVhrH5bJHHfwvW7LrekXFw2vQo4nU',
      title: 'Everyday git',
      intro: 'Type the git command for each situation: status, staging, committing, branches and undoing small mistakes.',
      ...deck,
    },
    {
      slug: 'git-remotes',
      ref: 'HTYYOvqPMcsQrXD8aSfQxAuXz1ggExRT',
      title: 'Remotes and syncing',
      intro: 'Type the git command for working with remotes: cloning, fetching, pulling, pushing and tracking branches.',
      ...deck,
    },
    {
      slug: 'git-history',
      ref: 'kFN6PXuMD0ZloUSsfvzdg-6C5fez0IYA',
      title: 'Changing history safely',
      intro: 'Type the git command to amend, rebase, reset, revert or recover commits, and know which is safe once others have pulled.',
      ...deck,
    },
    {
      slug: 'gh-workflow',
      ref: 'vzZN6EG-U6L5_zTEBh9pVjuauUNUGvnc',
      title: 'GitHub CLI and pull requests',
      intro: 'Type the gh command for each step of a pull request: sign in, open, check out, check, review and merge.',
      ...deck,
    },
    {
      slug: 'git-messages',
      ref: '5ojWJC1K1VKtB6wxuyuaHlVO4USw9Xfc',
      title: 'What git is telling you',
      intro: 'Git printed a message. Type the command you should run next.',
      ...deck,
    },
  ],
  (d) => `/d/${encodeURIComponent(d.slug)}`,
);
