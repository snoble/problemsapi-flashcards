'use client';

import { FormEvent, useRef, useState } from 'react';

import { fetchDeck, type Loaded } from '../lib/deck';
import { messageOf, postJson } from '../lib/request';
import { LearnerChecked, type Card, type Deck } from '../lib/schemas';
import Tex from './Tex';

const PREFETCH_AT = 5;

type Result = 'right' | 'wrong' | 'unread' | null;

type Stage =
  | { name: 'idle' }
  | { name: 'loading' }
  // `showing` changes every time a card goes up, restarting its countdown.
  | { name: 'card'; at: number; showing: number; tries: number; result: Result }
  | { name: 'done' };

const Question = ({ card }: { card: Card }) => (card.latex ? <Tex latex={card.latex} /> : <>{card.prompt}</>);

export default function Flashcards({ first }: { first: Loaded | null }) {
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

  const input = useRef<HTMLInputElement>(null);
  const upcoming = useRef<Promise<Loaded> | null>(first ? Promise.resolve(first) : null);
  const showings = useRef(0);
  const missed = useRef(new Set<number>());
  // Time can run out while a check is on its way; that check then settles the card.
  const inFlight = useRef(false);
  const late = useRef(false);
  const lastSent = useRef('');

  const finished = cards.length - queue.length;

  function prefetch() {
    if (upcoming.current) return;
    const loading = fetchDeck();
    loading.catch(() => {
      if (upcoming.current === loading) upcoming.current = null;
    });
    upcoming.current = loading;
  }

  function show(at: number) {
    showings.current += 1;
    late.current = false;
    setAnswer('');
    setStage({ name: 'card', at, showing: showings.current, tries: 0, result: null });
    input.current?.focus();
  }

  async function start() {
    setProblem('');
    setNotice('');
    setBusy(true);
    setStage({ name: 'loading' });
    const ready = upcoming.current;
    upcoming.current = null;
    try {
      const loaded = await (ready ? ready.catch(fetchDeck) : fetchDeck());
      if (loaded.cards.length === 0) throw new Error('The deck came back empty. Try another.');
      window.scrollTo(0, 0);
      setDeck(loaded.deck);
      setCards(loaded.cards);
      setQueue(loaded.cards.map((_, i) => i));
      missed.current = new Set();
      setFirstTry(0);
      setCameBack(0);
      show(0);
    } catch (e) {
      setProblem(messageOf(e));
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

  async function mark(given: string, atDeadline: boolean) {
    if (stage.name !== 'card' || !deck) return;
    const card = cards[stage.at];
    setProblem('');
    inFlight.current = true;
    setBusy(true);
    let result: Result = null;
    try {
      const { marks } = await postJson(
        new URL('/learner/check', deck.apiUrl),
        { token: deck.token, by_question: [{ question: card.id, answer: given }] },
        LearnerChecked,
        deck.publishableKey,
      );
      const found = marks.find((m) => m.question === card.id);
      if (!found) throw new Error('The check came back without a mark for this card.');
      result = found.correct ? 'right' : found.value ? 'wrong' : 'unread';
      const tries = stage.tries + 1;
      if (result === 'right' && tries === 1 && !missed.current.has(stage.at)) setFirstTry((n) => n + 1);
      setStage({ ...stage, tries, result });
      if (result !== 'right') input.current?.select();
    } catch (e) {
      setProblem(messageOf(e));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
    if (result !== 'right' && (atDeadline || late.current)) later(stage.at, true);
  }

  // A right answer still in the box when time runs out counts, even if it was never sent.
  function expire() {
    if (stage.name !== 'card' || stage.result === 'right') return;
    if (inFlight.current) {
      late.current = true;
      return;
    }
    const given = answer.trim();
    const alreadyMarked = stage.result !== null && given === lastSent.current;
    if (given && !alreadyMarked) void mark(given, true);
    else later(stage.at, true);
  }

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
    if (cards.length - rest.length >= PREFETCH_AT) prefetch();
    if (rest.length > 0) show(rest[0]);
    else setStage({ name: 'done' });
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
          <div className={`timer ${stage.result === 'right' ? 'stopped' : ''}`} role="timer" aria-label="Five seconds for this card">
            <div key={stage.showing} className="timer-fill" onAnimationEnd={expire} />
          </div>
          <p className="question" data-testid="question">
            <Question card={cards[stage.at]} />
          </p>
          <form className="answer" onSubmit={check}>
            <input
              ref={input}
              autoFocus
              value={answer}
              onChange={(e) => {
                if (stage.result !== 'right') setAnswer(e.target.value);
              }}
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
            {stage.result === 'right' && `Right! The answer is ${answer.trim()}.`}
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
          {cameBack > 0 && <p className="hint">{cameBack === 1 ? '1 card' : `${cameBack} cards`} came back for another go.</p>}
          <div className="row">
            <button className="primary" onClick={start} disabled={busy}>
              New deck
            </button>
          </div>
        </section>
      )}

      {problem && (
        <p className="problem" role="alert">
          {problem}
        </p>
      )}
    </>
  );
}
