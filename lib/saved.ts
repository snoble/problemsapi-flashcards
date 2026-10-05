// The boards this browser has joined, the picked one and the last player
// name, in localStorage. Where localStorage is unavailable they last for the visit.
import { useSyncExternalStore } from 'react';
import { z } from 'zod';

const Joined = z.object({ id: z.string(), name: z.string() });
export type Joined = z.infer<typeof Joined>;
export type Saved = { boards: Joined[]; picked: string | null; player: string };

const BOARDS = 'flashcards.boards';
const PICKED = 'flashcards.board';
const PLAYER = 'flashcards.name';

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

function joined(raw: string | null): Joined[] {
  try {
    return z.array(Joined).catch([]).parse(JSON.parse(raw ?? '[]'));
  } catch {
    return [];
  }
}

const nothing: Saved = { boards: [], picked: null, player: '' };
let last: { raw: string; saved: Saved } | null = null;

function snapshot(): Saved {
  const parts = [read(BOARDS), read(PICKED), read(PLAYER)];
  const raw = JSON.stringify(parts);
  if (last?.raw !== raw) {
    const boards = joined(parts[0]);
    const picked = boards.find((b) => b.id === parts[1])?.id ?? boards[0]?.id ?? null;
    last = { raw, saved: { boards, picked, player: parts[2] ?? '' } };
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

export const pickBoard = (id: string) => write(PICKED, id);

export const savePlayer = (name: string) => write(PLAYER, name);

export function joinBoard(board: Joined) {
  const boards = joined(read(BOARDS));
  if (!boards.some((b) => b.id === board.id)) write(BOARDS, JSON.stringify([...boards, { id: board.id, name: board.name }]));
  pickBoard(board.id);
}
