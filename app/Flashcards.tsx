'use client';

// The learner's side: everything here runs in the browser with only the
// publishable key and a pull's token, as a customer's learner page does.
// It reads the deck from /learner/pull, which never carries answers, and
// marks each typed answer with /learner/check.
//
// On a phone the answer box keeps the keyboard up for the whole deck: it is
// never disabled, and Enter checks an answer, then moves to the next card.
//
// Each card has five seconds. When they run out, a right answer still in
// the box counts, even if it was never sent; anything else is a timeout,
// and the card goes to the back of the deck. The deck ends when every card
// has been answered right.
import { FormEvent, useEffect, useRef, useState } from 'react';

import { messageOf, postJson } from '../lib/request';
import { Deck, LearnerChecked, LearnerPull, type Card } from '../lib/schemas';
import Tex from './Tex';

type Loaded = { deck: Deck; cards: Card[] };

type Stage =
  | { name: 'idle' }
  | { name: 'loading' }
  // `at` is the card's index in the deck; `showing` counts every time a
  // card is put up, so a card that comes back gets a fresh five seconds.
  | { name: 'card'; at: number; showing: number; tries: number; result: 'right' | 'wrong' | 'unread' | null }
  | { name: 'done' };

// A card as the page shows it: the question's LaTeX, typeset, or its
// plain prompt when a question has no LaTeX.
const Question = ({ card }: { card: Card }) => (card.latex ? <Tex latex={card.latex} /> : <>{card.prompt}</>);

// How long a card stays up before it times out.
const CARD_MS = 5000;

// How many cards are answered right before the next deck starts loading,
// so "New deck" has it ready without a wait on the app's server and the
// API. The first deck starts loading when the page opens, so "Start a
// deck" has it ready too.
const PREFETCH_AT = 5;

// A new pull from the app's server, then its questions through the learner route.
async function loadDeck(): Promise<Loaded> {
  const deck = await postJson('/api/deck', {}, Deck);
  const learner = await postJson(new URL('/learner/pull', deck.apiUrl), { token: deck.token }, LearnerPull, deck.publishableKey);
  if (learner.questions.length === 0) throw new Error('The deck came back empty. Try another.');
  return { deck, cards: learner.questions };
}

export default function Flashcards() {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  // The cards still to answer right, the one up first.
  const [queue, setQueue] = useState<number[]>([]);
  const [stage, setStage] = useState<Stage>({ name: 'idle' });
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [notice, setNotice] = useState('');
  const [left, setLeft] = useState(CARD_MS);
  const [firstTry, setFirstTry] = useState(0);
  const [cameBack, setCameBack] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const upcoming = useRef<Promise<Loaded> | null>(null);
  // When the card up now was put up, and how many cards have been put up.
  const shownAt = useRef(0);
  const showings = useRef(0);
  // Cards that timed out or were skipped: a later right answer is not first-try.
  const missed = useRef(new Set<number>());
  // A check on its way, and whether time ran out meanwhile: then that
  // check settles the card.
  const inFlight = useRef(false);
  const late = useRef(false);
  // The last answer sent with Check, so the deadline does not send it again.
  const lastSent = useRef('');
  const finished = cards.length - queue.length;

  useEffect(() => {
    if (stage.name === 'card') input.current?.focus();
  }, [stage]);

  // On the start screen, or partway through a deck, start loading the next
  // one. A failure here is forgotten: "Start a deck" or "New deck" then
  // loads one itself and reports its own error.
  useEffect(() => {
    const due = stage.name === 'idle' || (stage.name === 'card' && finished >= PREFETCH_AT);
    if (!due || upcoming.current) return;
    const loading = loadDeck();
    loading.catch(() => {
      if (upcoming.current === loading) upcoming.current = null;
    });
    upcoming.current = loading;
  }, [stage, finished]);

  // The countdown: it runs while a card is up and not yet answered right.
  const expire = useRef<() => void>(() => {});
  const counting = stage.name === 'card' && stage.result !== 'right' ? stage.showing : null;
  useEffect(() => {
    if (counting === null) return;
    const tick = () => {
      const rest = shownAt.current + CARD_MS - Date.now();
      setLeft(Math.max(0, rest));
      if (rest <= 0) {
        clearInterval(timer);
        expire.current();
      }
    };
    const timer = setInterval(tick, 100);
    return () => clearInterval(timer);
  }, [counting]);

  function show(at: number) {
    showings.current += 1;
    shownAt.current = Date.now();
    late.current = false;
    setLeft(CARD_MS);
    setAnswer('');
    setStage({ name: 'card', at, showing: showings.current, tries: 0, result: null });
  }

  async function start() {
    setProblem('');
    setNotice('');
    setBusy(true);
    setStage({ name: 'loading' });
    const ready = upcoming.current;
    upcoming.current = null;
    try {
      const loaded = await (ready ? ready.catch(() => loadDeck()) : loadDeck());
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

  // Sends the card up now to the back of the deck and puts up the next one.
  // A card left on its own comes straight back with a fresh five seconds.
  function later(at: number, timedOut: boolean) {
    if (!missed.current.has(at)) setCameBack((n) => n + 1);
    missed.current.add(at);
    const rest = [...queue.slice(1), at];
    setQueue(rest);
    setNotice(timedOut ? "Time's up. That card comes back later." : '');
    show(rest[0]);
  }

  // Marks `given` for the card up now. At the deadline, or when time ran out
  // while this check was on its way, anything but a right answer is a timeout.
  async function mark(given: string, atDeadline: boolean) {
    if (stage.name !== 'card' || !deck) return;
    const card = cards[stage.at];
    setProblem('');
    inFlight.current = true;
    setBusy(true);
    let result: 'right' | 'wrong' | 'unread' | null = null;
    try {
      const checked = await postJson(
        new URL('/learner/check', deck.apiUrl),
        { token: deck.token, by_question: [{ question: card.id, answer: given }] },
        LearnerChecked,
        deck.publishableKey,
      );
      const found = checked.marks.find((m) => m.question === card.id);
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

  expire.current = () => {
    if (stage.name !== 'card' || stage.result === 'right') return;
    if (inFlight.current) {
      late.current = true;
      return;
    }
    const given = answer.trim();
    // An answer already marked is not sent again.
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
          <div
            className={`timer ${stage.result === 'right' ? 'stopped' : ''}`}
            role="timer"
            aria-label={`${Math.ceil(left / 1000)} seconds left`}
          >
            <div className="timer-fill" style={{ width: `${(left / CARD_MS) * 100}%` }} />
          </div>
          <p className="question" data-testid="question">
            <Question card={cards[stage.at]} />
          </p>
          <form className="answer" onSubmit={check}>
            <input
              ref={input}
              value={answer}
              onChange={(e) => {
                // A right answer stays as typed until the next card.
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
