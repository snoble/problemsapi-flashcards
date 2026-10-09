// A board is a name, the deck it races on and its ten best times, reached by
// an unguessable id that its invite link carries. Times live in one Redis
// sorted set per board. Values are read as the strings they were written as
// and parsed here, so a board named "2024" stays a name.
import 'server-only';
import { randomBytes } from 'node:crypto';
import { Redis } from '@upstash/redis';
import { z } from 'zod';

import { Board, BoardId, type DeckSpec, FIRST_DECK, NewBoard, NewScore, Score, TOP, json } from './schemas';

// The app's deck of a slug, or null when it has none.
export type FindDeck = (slug: string) => DeckSpec | null;

const redis = Redis.fromEnv({ automaticDeserialization: false });

export class BoardError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function parsed<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) throw new BoardError(result.error.issues[0].message, 400);
  return result.data;
}

const Scores = z.array(json(Score));

const nameKey = (id: string) => `board:${id}`;
const deckKey = (id: string) => `board:${id}:deck`;
const scoresKey = (id: string) => `board:${id}:scores`;

export async function createBoard(findDeck: FindDeck, body: unknown): Promise<Board> {
  const { name, deck } = parsed(NewBoard, body);
  if (!findDeck(deck)) throw new BoardError('That deck does not exist.', 400);
  const id = randomBytes(12).toString('base64url');
  await redis.pipeline().set(deckKey(id), deck).set(nameKey(id), name).exec();
  return { id, name, deck, scores: [] };
}

export async function findBoard(rawId: string): Promise<Board | null> {
  const id = BoardId.safeParse(rawId);
  if (!id.success) return null;
  const [name, deck, scores] = await redis
    .pipeline()
    .get<string>(nameKey(id.data))
    .get<string>(deckKey(id.data))
    .zrange<string[]>(scoresKey(id.data), 0, TOP - 1)
    .exec();
  if (name === null) return null;
  return Board.parse({ id: id.data, name, deck: deck ?? FIRST_DECK, scores: Scores.parse(scores) });
}

export async function addScore(findDeck: FindDeck, id: string, body: unknown): Promise<Board | null> {
  const { name, ms, mistakes } = parsed(NewScore, body);
  const board = await findBoard(id);
  if (!board) return null;
  const deck = findDeck(board.deck);
  if (!deck) throw new BoardError("That board's deck is no longer here.", 404);
  if (ms < mistakes * deck.mistakeSeconds * 1000) throw new BoardError('That time is shorter than its mistakes.', 400);
  const score: Score = { name, ms, mistakes, at: Date.now() };
  const [, , scores] = await redis
    .pipeline()
    .zadd(scoresKey(board.id), { score: ms, member: JSON.stringify(score) })
    .zremrangebyrank(scoresKey(board.id), TOP, -1)
    .zrange<string[]>(scoresKey(board.id), 0, TOP - 1)
    .exec();
  return { ...board, scores: Scores.parse(scores) };
}
