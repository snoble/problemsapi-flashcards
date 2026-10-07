# Flashcards

A small Next.js app built on the [Problems API](https://problemsapi.com): flashcard decks, each from its own stream, with a timer on each card and scoreboards you share with friends by an invite link. The live deck is times tables to 12 × 12, five seconds a card. It is live at [problemsapi-flashcards.vercel.app](https://problemsapi-flashcards.vercel.app).

It is meant to be read. It shows the way a customer's app uses the API: the secret key stays on the server, and the browser gets only what it needs to show one deck and check its answers.

## How it uses the API

The Problems API has two kinds of key. A secret key makes streams and pulls. A publishable key can only read a pull's questions and check answers to them, and only with that pull's token.

1. The server makes each deck with the secret key ([`lib/problemsapi.ts`](lib/problemsapi.ts)). The first time, it copies the deck's stream into the account from a shared ref (`POST /streams/from_ref`). Then it makes a fresh pull of the deck's size (`POST /pulls/create`) and hands the browser the pull's token and the publishable key. The deck's page starts the first deck while it renders ([`app/d/[slug]/page.tsx`](app/d/[slug]/page.tsx)), and later decks come from [`app/api/deck/route.ts`](app/api/deck/route.ts).
2. The browser reads the questions with that token (`POST /learner/pull`). Questions never carry their answers. In a deck that typesets, each question's LaTeX is shown with [KaTeX](https://katex.org); other decks show the question's words.
3. The browser sends each answer to `POST /learner/check`, which marks it ([`app/Flashcards.tsx`](app/Flashcards.tsx)). A number deck's answer is typed. A choice deck's answer is the number of an option, tapped on a button.

Every response is parsed with a [Zod](https://zod.dev) schema ([`lib/schemas.ts`](lib/schemas.ts)) before the app uses it.

The secret key never leaves the server: `lib/problemsapi.ts` imports `server-only`, so the build fails if browser code imports it.

## Decks

`FLASHCARD_DECKS` lists the decks as JSON ([`lib/decks.ts`](lib/decks.ts), checked by the `Decks` schema in `lib/schemas.ts`). Each deck has a slug, its stream's ref, a title and intro, how many cards it has, the seconds a card gets, the seconds a mistake adds, whether to typeset, and its kind of answer. The front page lists them, and each plays at `/d/<slug>`. `.env.example` has the times-tables deck.

## Scoreboards

A deck's time runs from the first card to the last right answer, plus the deck's penalty for each wrong answer sent. Anyone can make a board for a deck, with no account, and share its invite link (`/join/<id>`). The browser remembers the boards it has joined in localStorage, and a dropdown switches between that deck's boards. A time good enough for a board's top ten asks for a name, so people who share a browser each save their own.

Boards live in [Upstash Redis](https://upstash.com), one sorted set of times per board ([`lib/boards.ts`](lib/boards.ts)). Times are measured in the browser and trusted, so a board is only as fair as the people it is shared with.

## Run your own

You need:

- A Problems API account and its secret key, from your account page on [problemsapi.com](https://problemsapi.com).
- A publishable key. Make one with the secret key: `POST /publishable_keys/create`.
- A stream ref for each deck. Design a stream by chatting with the API, then `POST /streams/share` answers its ref. Any account can copy a stream from its ref.
- For scoreboards, an Upstash Redis database. On Vercel, add it from the project's Storage tab (Upstash for Redis), which sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`. Without it, decks still work and the board routes answer 503.

Copy `.env.example` to `.env.local`, fill it in, and run:

```bash
npm install
npm run dev
```

Or deploy it to Vercel and set the same variables there:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsnoble%2Fproblemsapi-flashcards&env=PROBLEMS_API_SECRET_KEY,PROBLEMS_API_PUBLISHABLE_KEY,FLASHCARD_DECKS)

`vercel.json` runs the routes in Oregon (`pdx1`), next to the API. Change or remove it if you deploy elsewhere.

## Where things are

| Path | What it does |
| --- | --- |
| `app/page.tsx` | The front page: the list of decks |
| `app/d/[slug]/page.tsx` | A deck's page, a server component around the flashcards |
| `app/Flashcards.tsx` | The deck in the browser: cards, timer, checks, the deck's time |
| `app/Boards.tsx` | The scoreboard panel: pick, make and share boards, save a time |
| `app/join/[id]/` | The invite link: shows the board and a button to join it |
| `app/api/deck/route.ts` | Makes a deck with the secret key |
| `app/api/boards/` | Board routes: make a board, read it, save a time |
| `lib/decks.ts` | The decks this deploy serves |
| `lib/problemsapi.ts` | The server's calls to the Problems API |
| `lib/boards.ts` | Boards in Upstash Redis |
| `lib/saved.ts` | What the browser remembers about boards |
| `lib/schemas.ts` | Zod schemas for every request, response and stored value |

## License

MIT
