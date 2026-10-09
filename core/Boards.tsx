'use client';

import { FormEvent, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';

import { get, post } from './request';
import { boardsOf, joinBoard, pickBoard, savePlayer, useSaved } from './saved';
import { Board, type DeckView, TOP, seconds } from './schemas';

// A finished deck; `ms` includes the mistakes' penalty.
export type Finish = { deck: number; ms: number; mistakes: number };

const boardUrl = (id: string) => `/api/boards/${encodeURIComponent(id)}`;
const fetchBoard = (url: string) => get(Board, url);

export default function Boards({ deck, finish }: { deck: DeckView; finish: Finish | null }) {
  const saved = useSaved();
  const { boards, picked } = boardsOf(saved, deck.slug);
  const lastPlayer = saved.player;
  const { data: board, error, mutate } = useSWR(picked ? boardUrl(picked) : null, fetchBoard);
  const { mutate: cache } = useSWRConfig();
  const [making, setMaking] = useState(false);
  const [boardName, setBoardName] = useState('');
  const [typed, setTyped] = useState<string | null>(null);
  const [savedDeck, setSavedDeck] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [copied, setCopied] = useState(false);
  const player = typed ?? lastPlayer;

  async function attempt(work: () => Promise<void>) {
    setBusy(true);
    setProblem('');
    try {
      await work();
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const make = (event: FormEvent) => {
    event.preventDefault();
    return attempt(async () => {
      const made = await post(Board, '/api/boards', { name: boardName, deck: deck.slug });
      await cache(boardUrl(made.id), made, { revalidate: false });
      joinBoard(made);
      setMaking(false);
      setBoardName('');
      setCopied(false);
    });
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!finish || !board) return;
    return attempt(async () => {
      const after = await post(Board, `${boardUrl(board.id)}/scores`, { name: player, ms: finish.ms, mistakes: finish.mistakes });
      await mutate(after, { revalidate: false });
      setSavedDeck(finish.deck);
      savePlayer(player.trim());
    });
  };

  const invite = board ? `${window.location.origin}/join/${board.id}` : '';
  const copy = () =>
    navigator.clipboard.writeText(invite).then(
      () => setCopied(true),
      () => setProblem('Copying did not work here. Select the link and copy it yourself.'),
    );

  const tenth = board?.scores[TOP - 1];
  const qualifies = finish && board && savedDeck !== finish.deck && (!tenth || finish.ms < tenth.ms);
  const shownProblem = problem || error?.message;

  return (
    <section className="panel boards" aria-label="High scores">
      {boards.length > 0 && (
        <label className="pick">
          Scoreboard{' '}
          <select
            value={picked ?? ''}
            onChange={(e) => {
              pickBoard(deck.slug, e.target.value);
              setCopied(false);
              setProblem('');
            }}
          >
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {qualifies && (
        <form className="save" onSubmit={save}>
          <p>That time makes the {board.name} top ten. Who played?</p>
          <input value={player} onChange={(e) => setTyped(e.target.value)} maxLength={24} aria-label="Your name" autoComplete="nickname" />
          <button className="primary" type="submit" disabled={busy || !player.trim()}>
            Save my time
          </button>
        </form>
      )}
      {finish && savedDeck === finish.deck && <p className="hint">Saved.</p>}

      {board &&
        (board.scores.length === 0 ? (
          <p className="hint">No times yet. Finish a deck to set the first one.</p>
        ) : (
          <ol className="scores">
            {board.scores.map((s) => (
              <li key={`${s.at}-${s.name}-${s.ms}`}>
                <span className="who">{s.name}</span>
                <span className="time">
                  {seconds(s.ms)}
                  {s.mistakes > 0 && <span className="hint"> with {seconds(s.mistakes * deck.mistakeSeconds * 1000)} added</span>}
                </span>
              </li>
            ))}
          </ol>
        ))}

      {board && (
        <div className="invite">
          <input readOnly value={invite} aria-label="Invite link" onFocus={(e) => e.target.select()} />
          <button onClick={copy}>{copied ? 'Copied' : 'Copy invite link'}</button>
        </div>
      )}

      {making ? (
        <form className="make" onSubmit={make}>
          <input value={boardName} onChange={(e) => setBoardName(e.target.value)} maxLength={40} placeholder="Board name" aria-label="Board name" autoFocus />
          <button className="primary" type="submit" disabled={busy || !boardName.trim()}>
            Make board
          </button>
          <button type="button" onClick={() => setMaking(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <div className="row">
          <button onClick={() => setMaking(true)}>New board</button>
        </div>
      )}
      {boards.length === 0 && !making && <p className="hint">Make a board and send its invite link. Everyone who opens it races for the same top ten.</p>}

      {shownProblem && (
        <p className="problem" role="alert">
          {shownProblem}
        </p>
      )}
    </section>
  );
}
