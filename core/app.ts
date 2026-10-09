// A flashcards app made from its decks: each deck names the shared ref of
// its stream (DeckSpec in schemas.ts), and `path` says where the app plays
// it. The decks are checked when the app is built. The result holds the
// route handlers every app serves; its route files re-export them.
import 'server-only';
import { z } from 'zod';

import { addScore, createBoard, findBoard } from './boards';
import { ProblemsApiError, newPull } from './problemsapi';
import { respond } from './respond';
import { DeckSpec } from './schemas';

type Params = { params: Promise<{ id: string }> };

const Wanted = z.object({ deck: z.string() });

export function flashcards(list: DeckSpec[], path: (deck: DeckSpec) => string) {
  const decks = z
    .array(DeckSpec)
    .min(1)
    .refine((all) => new Set(all.map((d) => d.slug)).size === all.length, 'Two decks share a slug.')
    .parse(list);

  const findDeck = (slug: string): DeckSpec | null => decks.find((d) => d.slug === slug) ?? null;

  // POST /api/deck: a new pull of a deck, made with the secret key.
  async function makeDeck(request: Request) {
    const wanted = Wanted.safeParse(await request.json().catch(() => null));
    const deck = wanted.success ? findDeck(wanted.data.deck) : null;
    if (!deck) return Response.json({ error: 'That deck does not exist.' }, { status: 404 });
    try {
      return Response.json(await newPull(deck));
    } catch (e) {
      if (!(e instanceof ProblemsApiError)) throw e;
      console.error(`deck ${deck.slug}: ${e.message}`);
      const retry = e.status === 503 || e.status === 429;
      return Response.json(
        { error: retry ? 'The question service is busy. Try again in a moment.' : 'A deck could not be made just now.' },
        { status: retry ? 503 : 502 },
      );
    }
  }

  // POST /api/boards
  async function makeBoard(request: Request) {
    const body: unknown = await request.json().catch(() => null);
    return respond(() => createBoard(findDeck, body));
  }

  // GET /api/boards/<id>
  async function readBoard(_request: Request, { params }: Params) {
    const { id } = await params;
    return respond(() => findBoard(id));
  }

  // POST /api/boards/<id>/scores
  async function saveScore(request: Request, { params }: Params) {
    const { id } = await params;
    const body: unknown = await request.json().catch(() => null);
    return respond(() => addScore(findDeck, id, body));
  }

  return { decks, findDeck, path, makeDeck, makeBoard, readBoard, saveScore };
}

export type Flashcards = ReturnType<typeof flashcards>;
