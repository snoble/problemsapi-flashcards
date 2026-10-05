// A board is a name and its ten best times, reached by an unguessable id
// that its invite link carries. Times live in one Redis sorted set per board.
import 'server-only';
import { randomBytes } from 'node:crypto';
import { Redis } from '@upstash/redis';
import { z } from 'zod';

import { Board, BoardId, NewBoard, NewScore, Score, TOP } from '@/lib/schemas';

const redis = Redis.fromEnv();

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

const nameKey = (id: string) => `board:${id}`;
const scoresKey = (id: string) => `board:${id}:scores`;

export async function createBoard(body: unknown): Promise<Board> {
  const { name } = parsed(NewBoard, body);
  const id = randomBytes(12).toString('base64url');
  await redis.set(nameKey(id), name);
  return { id, name, scores: [] };
}

export async function findBoard(rawId: string): Promise<Board | null> {
  const id = BoardId.safeParse(rawId);
  if (!id.success) return null;
  const [name, scores] = await redis.pipeline().get(nameKey(id.data)).zrange(scoresKey(id.data), 0, TOP - 1).exec();
  return name === null ? null : Board.parse({ id: id.data, name, scores });
}

export async function addScore(id: string, body: unknown): Promise<Board | null> {
  const { name, ms, mistakes } = parsed(NewScore, body);
  const board = await findBoard(id);
  if (!board) return null;
  const score: Score = { name, ms, mistakes, at: Date.now() };
  const [, , scores] = await redis
    .pipeline()
    .zadd(scoresKey(board.id), { score: ms, member: score })
    .zremrangebyrank(scoresKey(board.id), TOP, -1)
    .zrange(scoresKey(board.id), 0, TOP - 1)
    .exec();
  return { ...board, scores: z.array(Score).parse(scores) };
}
