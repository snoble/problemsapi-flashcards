// The boards this browser has joined, the board picked for each deck and the
// last player name, in localStorage. Where localStorage is unavailable they
// last for the visit.
import { useSyncExternalStore } from 'react';
import { z } from 'zod';

import { FIRST_DECK, json } from './schemas';

const Joined = z.object({ id: z.string(), name: z.string(), deck: z.string().default(FIRST_DECK) });
export type Joined = z.infer<typeof Joined>;
export type Saved = { boards: Joined[]; picks: Record<string, string>; player: string };

const BOARDS = 'flashcards.boards';
const PICKS = 'flashcards.picks';
const PLAYER = 'flashcards.name';

const JoinedList = json(z.array(Joined)).catch([]);
const Picks = json(z.record(z.string(), z.string())).catch({});

const visit = new Map<string, string>();
const listeners = new Set<() => void>();

function read(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? visit.get(key) ?? null;
  } catch {
    return visit.get(key) ?? null;
  }
}

function write(key: string, value: string) {
  visit.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch {}
  listeners.forEach((listener) => listener());
}

const nothing: Saved = { boards: [], picks: {}, player: '' };
let last: { raw: string; saved: Saved } | null = null;

function snapshot(): Saved {
  const parts = [read(BOARDS), read(PICKS), read(PLAYER)];
  const raw = JSON.stringify(parts);
  if (last?.raw !== raw) {
    last = { raw, saved: { boards: JoinedList.parse(parts[0] ?? '[]'), picks: Picks.parse(parts[1] ?? '{}'), player: parts[2] ?? '' } };
  }
  return last.saved;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

export const useSaved = (): Saved => useSyncExternalStore(subscribe, snapshot, () => nothing);

// The joined boards of one deck, and the one picked for it.
export function boardsOf({ boards, picks }: Saved, deck: string) {
  const mine = boards.filter((b) => b.deck === deck);
  return { boards: mine, picked: mine.find((b) => b.id === picks[deck])?.id ?? mine[0]?.id ?? null };
}

export const pickBoard = (deck: string, id: string) => write(PICKS, JSON.stringify({ ...snapshot().picks, [deck]: id }));

export const savePlayer = (name: string) => write(PLAYER, name);

export function joinBoard(board: Joined) {
  const { boards } = snapshot();
  if (!boards.some((b) => b.id === board.id)) write(BOARDS, JSON.stringify([...boards, { id: board.id, name: board.name, deck: board.deck }]));
  pickBoard(board.deck, board.id);
}
