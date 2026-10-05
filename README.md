# Times tables flashcards

A small Next.js app built on the [Problems API](https://problemsapi.com):
times-table flashcards up to 12 × 12, five seconds a card, with every answer
checked by the API.

Live: https://problemsapi-flashcards.vercel.app

## How it uses the API

- **The server holds the secret key.** `lib/problemsapi.ts` (marked
  `server-only`) copies the app's stream into your account from a shared ref
  (`POST /streams/from_ref`), then makes one pull per deck
  (`POST /pulls/create`). The route `app/api/deck/route.ts` hands the browser
  only that pull's token and your publishable key.
- **The browser holds the publishable key.** `app/Flashcards.tsx` reads the
  deck from `POST /learner/pull` (questions, never answers) and marks each
  typed answer with `POST /learner/check`. A publishable key with a pull's
  token reaches that pull and nothing else.
- **Every deck runs the same program.** The stream was designed in the API's
  chat, then shared with `POST /streams/share`. Its ref pins the definition
  and the program, so each deploy pulls from exactly that stream and no model
  is called when a deck is made.

## Run it

1. Get a secret key from your problemsapi.com account.
2. Make a publishable key:
   ```sh
   curl -X POST https://api.problemsapi.com/publishable_keys/create \
     -H "Authorization: Bearer $PROBLEMS_API_SECRET_KEY" \
     -H 'content-type: application/json' -d '{"name":"flashcards"}'
   ```
3. Get a stream ref: design a stream in the API's chat
   (`POST /chat/completions` with `"model": "stream:<slug>"`), then
   `POST /streams/share {"stream": "<slug>"}` answers its `ref`.
4. Copy `.env.example` to `.env.local` and fill in the keys and the ref.
5. `npm install && npm run dev`, then open http://localhost:3000.

To deploy on Vercel, import the repo and set the same environment variables
in the project's settings. Never commit real keys.
