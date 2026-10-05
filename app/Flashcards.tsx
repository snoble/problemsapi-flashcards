'use client';

// The answer box is never disabled, so a phone keeps its keyboard up for the whole deck.
import katex from 'katex';
import { FormEvent, useRef, useState } from 'react';

import Boards, { type Finish } from './Boards';
import { post } from '@/lib/request';
import { type Card, Deck, LearnerChecked, LearnerPull, MISTAKE_MS, seconds } from '@/lib/schemas';

type Loaded = { deck: Deck; cards: Card[] };
type Result = 'right' | 'wrong' | 'unread' | null;
type Stage =
  | { name: 'idle' }
  | { name: 'loading' }
  // `showing` keys the timer bar, so a card that comes back restarts it.
  | { name: 'card'; at: number; showing: number; tries: number; result: Result }
  | { name: 'done' };

const CARD_MS = 5000;
// After this many right answers, the next deck starts loading.
const PREFETCH_AT = 5;

async function cardsFor(deck: Deck): Promise<Loaded> {
  const { questions } = await post(LearnerPull, `${deck.apiUrl}/learner/pull`, { token: deck.token }, deck.publishableKey);
  if (questions.length === 0) throw new Error('The deck came back empty. Try another.');
  return { deck, cards: questions };
}

const newDeck = async () => cardsFor(await post(Deck, '/api/deck', {}));

function Question({ card }: { card: Card }) {
  if (card.latex === null) return <p className="question" data-testid="question" data-prompt={card.prompt}>{card.prompt}</p>;
  const html = katex.renderToString(card.latex, { throwOnError: false });
  return <p className="question" data-testid="question" data-prompt={card.prompt} dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function Flashcards({ firstDeck }: { firstDeck: Promise<Deck | null> }) {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [queue, setQueue] = useState<number[]>([]);
  const [stage, setStage] = useState<Stage>({ name: 'idle' });
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [notice, setNotice] = useState('');
  const [firstTry, setFirstTry] = useState(0);
  const [cameBack, setCameBack] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [finish, setFinish] = useState<Finish | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const upcoming = useRef<Promise<Loaded> | null>(null);
  const usedFirst = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const showings = useRef(0);
  const startedAt = useRef(0);
  const decks = useRef(0);
  // Cards that timed out or were skipped: a later right answer is not first-try.
  const missed = useRef(new Set<number>());
  // A check on its way, and whether its card's time ran out meanwhile.
  const inFlight = useRef(false);
  const late = useRef(false);
  const lastSent = useRef('');
  const expire = useRef(() => {});
  const finished = cards.length - queue.length;

  function show(at: number) {
    showings.current += 1;
    late.current = false;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => expire.current(), CARD_MS);
    setAnswer('');
    setStage({ name: 'card', at, showing: showings.current, tries: 0, result: null });
    input.current?.focus();
  }

  async function nextDeck(): Promise<Loaded> {
    const ready = upcoming.current;
    upcoming.current = null;
    if (ready) return ready.catch(newDeck);
    if (usedFirst.current) return newDeck();
    usedFirst.current = true;
    const made = await firstDeck;
    return made ? cardsFor(made) : newDeck();
  }

  async function start() {
    setProblem('');
    setNotice('');
    setBusy(true);
    setStage({ name: 'loading' });
    try {
      const loaded = await nextDeck();
      window.scrollTo(0, 0);
      setDeck(loaded.deck);
      setCards(loaded.cards);
      setQueue(loaded.cards.map((_, i) => i));
      missed.current = new Set();
      setFirstTry(0);
      setCameBack(0);
      setMistakes(0);
      setFinish(null);
      decks.current += 1;
      startedAt.current = performance.now();
      show(0);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
      setStage({ name: 'idle' });
    } finally {
      setBusy(false);
    }
  }

  function later(at: number, timedOut: boolean) {
    if (!missed.current.has(at)) setCameBack((n) => n + 1);
    missed.current.add(at);
    const rest = [...queue.slice(1), at];
    setQueue(rest);
    setNotice(timedOut ? "Time's up. That card comes back later." : '');
    show(rest[0]);
  }

  // At the deadline, or when time ran out while the check was on its way,
  // anything but a right answer is a timeout, not a mistake.
  async function mark(given: string, atDeadline: boolean) {
    if (stage.name !== 'card' || !deck) return;
    const card = cards[stage.at];
    setProblem('');
    inFlight.current = true;
    setBusy(true);
    let result: Result = null;
    try {
      const { marks } = await post(
        LearnerChecked,
        `${deck.apiUrl}/learner/check`,
        { token: deck.token, by_question: [{ question: card.id, answer: given }] },
        deck.publishableKey,
      );
      const found = marks.find((m) => m.question === card.id);
      if (!found) throw new Error('The check came back without a mark for this card.');
      result = found.correct ? 'right' : found.value === null ? 'unread' : 'wrong';
      const tries = stage.tries + 1;
      input.current?.focus();
      if (result === 'right') {
        clearTimeout(timer.current);
        if (tries === 1 && !missed.current.has(stage.at)) setFirstTry((n) => n + 1);
      } else {
        if (result === 'wrong' && !atDeadline && !late.current) setMistakes((n) => n + 1);
        input.current?.select();
      }
      setStage({ ...stage, tries, result });
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
    if (result !== 'right' && (atDeadline || late.current)) later(stage.at, true);
  }

  expire.current = () => {
    if (stage.name !== 'card' || stage.result === 'right') return;
    if (inFlight.current) {
      late.current = true;
      return;
    }
    const given = answer.trim();
    if (given && !(stage.result !== null && given === lastSent.current)) void mark(given, true);
    else later(stage.at, true);
  };

  function check(event: FormEvent) {
    event.preventDefault();
    if (stage.name !== 'card' || inFlight.current) return;
    if (stage.result === 'right') return advance();
    const given = answer.trim();
    if (!given) return;
    lastSent.current = given;
    void mark(given, false);
  }

  function advance() {
    if (stage.name !== 'card') return;
    const rest = queue.slice(1);
    setQueue(rest);
    setNotice('');
    if (cards.length - rest.length >= PREFETCH_AT && !upcoming.current) {
      const loading = newDeck();
      loading.catch(() => {
        if (upcoming.current === loading) upcoming.current = null;
      });
      upcoming.current = loading;
    }
    if (rest.length > 0) return show(rest[0]);
    clearTimeout(timer.current);
    setFinish({ deck: decks.current, ms: Math.round(performance.now() - startedAt.current) + mistakes * MISTAKE_MS, mistakes });
    setStage({ name: 'done' });
  }

  return (
    <>
      {(stage.name === 'idle' || stage.name === 'loading') && (
        <section className="panel">
          <button className="primary" onClick={start} disabled={busy}>
            {stage.name === 'loading' ? 'Making your deck…' : 'Start a deck'}
          </button>
          <p className="hint">Five seconds a card. A card you miss comes back later, until you have every one right.</p>
        </section>
      )}

      {stage.name === 'card' && (
        <section className="panel deck" aria-live="polite">
          <p className="progress">
            Card {finished + 1} of {cards.length}
          </p>
          <div className={`timer ${stage.result === 'right' ? 'stopped' : ''}`} role="timer" aria-label="Five seconds a card">
            <div className="timer-fill" key={stage.showing} style={{ animationDuration: `${CARD_MS}ms` }} />
          </div>
          <Question card={cards[stage.at]} />
          <form className="answer" onSubmit={check}>
            <input
              ref={input}
              value={answer}
              onChange={(e) => {
                if (stage.result !== 'right') setAnswer(e.target.value);
              }}
              autoFocus
              inputMode="numeric"
              enterKeyHint={stage.result === 'right' ? 'next' : 'go'}
              autoComplete="off"
              aria-label="Your answer"
            />
            {stage.result !== 'right' && (
              <button className="primary" type="submit" disabled={busy}>
                Check
              </button>
            )}
          </form>
          <p className={`mark ${stage.result === 'right' ? 'right' : stage.result || notice ? 'wrong' : ''}`} role="status">
            {stage.result === 'right' && `Right! ${cards[stage.at].prompt} ${answer.trim()}`}
            {stage.result === 'wrong' && 'Not quite. Try again.'}
            {stage.result === 'unread' && 'Type a whole number.'}
            {stage.result === null && notice}
          </p>
          <div className="row">
            {stage.result === 'right' ? (
              <button onClick={advance}>Next card</button>
            ) : (
              <button onClick={() => later(stage.at, false)} disabled={busy}>
                Skip
              </button>
            )}
          </div>
        </section>
      )}

      {stage.name === 'done' && (
        <section className="panel">
          <p className="score">
            {firstTry} of {cards.length} right on the first try
          </p>
          {finish && (
            <p className="total" data-testid="time">
              Time {seconds(finish.ms)}
              {finish.mistakes > 0 && (
                <span className="hint">
                  {' '}
                  ({seconds(finish.ms - finish.mistakes * MISTAKE_MS)} plus {finish.mistakes === 1 ? '1 mistake' : `${finish.mistakes} mistakes`} × 5 s)
                </span>
              )}
            </p>
          )}
          {cameBack > 0 && <p className="hint">{cameBack === 1 ? '1 card' : `${cameBack} cards`} came back for another go.</p>}
          <div className="row">
            <button className="primary" onClick={start} disabled={busy}>
              New deck
            </button>
          </div>
        </section>
      )}

      {stage.name !== 'card' && <Boards finish={stage.name === 'done' ? finish : null} />}

      {problem && (
        <p className="problem" role="alert">
          {problem}
        </p>
      )}
    </>
  );
}
