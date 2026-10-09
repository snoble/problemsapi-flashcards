# Flashcards

Two small Next.js apps built on the [Problems API](https://problemsapi.com), sharing one core. Each plays flashcard decks, each deck from its own stream, with a timer on each card and scoreboards you share with friends by an invite link.

- [`times-tables/`](times-tables) is times tables to 12 × 12, five seconds a card, typed on a number pad. It never shows an answer: it is practice against the clock. Live at [problemsapi-flashcards.vercel.app](https://problemsapi-flashcards.vercel.app).
- [`git-commands/`](git-commands) is five decks of git and gh commands, twenty seconds a card, typed on the full keyboard. A learner who gives up on a card can see its answer. Live at [git-flashcards-problemsapi.vercel.app](https://git-flashcards-problemsapi.vercel.app).
- [`core/`](core) is what they share: the server's calls to the API, the deck in the browser, scoreboards, and the routes and pages both serve.

They are meant to be read. They show the way a customer's app uses the API: the secret key stays on the server, and the browser gets only what it needs to show one deck and check its answers.

## How it uses the API

The Problems API has two kinds of key. A secret key makes streams and pulls. A publishable key can only read a pull's questions and check answers to them, and only with that pull's token.

1. The server makes each deck with the secret key ([`core/problemsapi.ts`](core/problemsapi.ts)). The first time, it copies the deck's stream into the account from a shared ref (`POST /streams/from_ref`). Then it makes a fresh pull of the deck's size (`POST /pulls/create`) and hands the browser the pull's token and the publishable key. A deck's page starts the first deck while it renders, and later decks come from `/api/deck` ([`core/app.ts`](core/app.ts)).
2. The browser reads the questions with that token (`POST /learner/pull`). Questions never carry their answers. The times-tables app shows each question's LaTeX with [KaTeX](https://katex.org); the git app shows the question's words.
3. The browser sends each answer to `POST /learner/check`, which marks it ([`core/Flashcards.tsx`](core/Flashcards.tsx)). Each app draws its own cards on that shared loop: [`times-tables/app/Tables.tsx`](times-tables/app/Tables.tsx) and [`git-commands/app/Commands.tsx`](git-commands/app/Commands.tsx). A git command is taken as typed, up to 40 characters.
4. In the git app, a learner who gives up on a card taps Show answer. The browser asks the app's own server ([`git-commands/app/api/deck/answer/route.ts`](git-commands/app/api/deck/answer/route.ts)), which reads the pull with the secret key (`POST /pulls/get`) and returns that one card's answer. The learner routes never give answers, so a reveal goes through the server that made the pull. It costs the deck's mistake penalty, and the card comes back later. Anyone holding a pull's key can reveal its cards this way, which suits flashcards but would not suit a graded quiz.

Every response is parsed with a [Zod](https://zod.dev) schema ([`core/schemas.ts`](core/schemas.ts)) before the app uses it.

The secret key never leaves the server: `core/problemsapi.ts` imports `server-only`, so the build fails if browser code imports it.

## Decks

Each app lists its decks in its code ([`times-tables/lib/flashcards.ts`](times-tables/lib/flashcards.ts), [`git-commands/lib/flashcards.ts`](git-commands/lib/flashcards.ts)), checked by the `DeckSpec` schema in `core/schemas.ts` when the app is built. Each deck has a slug, its stream's ref, a title and intro, how many cards it has, the seconds a card gets and the seconds a mistake adds. A ref pins the stream's program, so changing a deck is a commit. Any account can copy a stream from its ref, so your own deploy plays the same decks.

## Scoreboards

A deck's time runs from the first card to the last right answer, plus the deck's penalty for each wrong answer sent. Anyone can make a board for a deck, with no account, and share its invite link (`/join/<id>`). The browser remembers the boards it has joined in localStorage, and a dropdown switches between that deck's boards. A time good enough for a board's top ten asks for a name, so people who share a browser each save their own.

Boards live in [Upstash Redis](https://upstash.com), one sorted set of times per board ([`core/boards.ts`](core/boards.ts)). Times are measured in the browser and trusted, so a board is only as fair as the people it is shared with.

## Run your own

You need:

- A Problems API account and its secret key, from your account page on [problemsapi.com](https://problemsapi.com).
- A publishable key. Make one with the secret key: `POST /publishable_keys/create`.
- For scoreboards, an Upstash Redis database. On Vercel, add it from the project's Storage tab (Upstash for Redis), which sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`. Without it, decks still work and the board routes answer 503.

To play other decks, design a stream by chatting with the API, share it (`POST /streams/share` answers its ref), and list it in the app's `lib/flashcards.ts`.

Copy an app's `.env.example` to `.env.local` in its folder, fill it in, and run:

```bash
npm install
npm run dev --workspace times-tables
```

Or deploy one to Vercel, with the app's folder as the project's Root Directory, and set the same variables there:

[![Deploy times tables with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsnoble%2Fproblemsapi-flashcards&root-directory=times-tables&env=PROBLEMS_API_SECRET_KEY,PROBLEMS_API_PUBLISHABLE_KEY)

Each app's `vercel.json` runs its routes in Oregon (`pdx1`), next to the API. Change or remove it if you deploy elsewhere.

## Where things are

| Path | What it does |
| --- | --- |
| `core/app.ts` | An app made from its decks: the deck route and the board routes |
| `core/Flashcards.tsx` | The deck in the browser: cards, timer, checks, the deck's time |
| `core/Boards.tsx` | The scoreboard panel: pick, make and share boards, save a time |
| `core/pages.tsx` | A deck's page, the invite link and the not-found pages |
| `core/problemsapi.ts` | The server's calls to the Problems API |
| `core/boards.ts` | Boards in Upstash Redis |
| `core/saved.ts` | What the browser remembers about boards |
| `core/schemas.ts` | Zod schemas for every request, response and stored value |
| `times-tables/lib/flashcards.ts` | The times-tables deck |
| `times-tables/app/Tables.tsx` | A times-tables card: typeset question, number pad |
| `git-commands/lib/flashcards.ts` | The git decks |
| `git-commands/app/Commands.tsx` | A git card: typed command, Show answer |
| `git-commands/app/api/deck/answer/route.ts` | Shows one card's answer to a learner who gives up |

## License

MIT
