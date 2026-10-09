'use client';

// The deck in the browser, shared by every flashcards app: it reads a pull,
// shows its cards one at a time against the clock, sends each answer to be
// marked, brings missed cards back, times the deck and offers the boards.
// The app draws each card's face: its question, how an answer is given, the
// mark and the moves (see useDeck, Deck, Mark, AnswerBox and Moves).
// The answer box is never disabled, so a phone keeps its keyboard up for the whole deck.
import { type FormEvent, type InputHTMLAttributes, type ReactNode, type RefObject, useRef, useState } from 'react';

import Boards, { type Finish } from './Boards';
import { post } from './request';
import { type Card, type DeckView, LearnerChecked, LearnerPull, Pull, seconds, secondsWord } from './schemas';

type Loaded = { pull: Pull; cards: Card[] };
// `shown`: the learner gave up and was shown the answer.
export type Result = 'right' | 'wrong' | 'unread' | 'shown' | null;
type Stage =
  | { name: 'idle' }
  | { name: 'loading' }
  // `showing` keys the timer bar, so a card that comes back restarts it.
  | { name: 'card'; at: number; showing: number; tries: number; result: Result }
  | { name: 'done' };

// A deck in play: what the app's card face reads, and the moves it makes.
export type Play = {
  deck: DeckView;
  stage: Stage['name'];
  // The card on show, while a card is.
  card: Card | null;
  result: Result;
  // The answer shown to a learner who gave up.
  shown: string;
  answer: string;
  input: RefObject<HTMLInputElement | null>;
  busy: boolean;
  notice: string;
  // A right answer, or a shown one: the card waits for Next card.
  settled: boolean;
  type: (typed: string) => void;
  check: (event: FormEvent) => void;
  next: () => void;
  skip: () => void;
  // Shows the card's answer, fetched by `answerOf`; it counts as a mistake
  // and the card comes back later.
  giveUp: (answerOf: (pull: Pull, card: Card) => Promise<string>) => void;
  // For the panels around the card.
  view: {
    cards: number;
    finished: number;
    showing: number;
    problem: string;
    firstTry: number;
    cameBack: number;
    finish: Finish | null;
    start: () => void;
  };
};

// After this many right answers, the next deck starts loading.
const PREFETCH_AT = 5;

async function cardsFor(pull: Pull): Promise<Loaded> {
  const { questions } = await post(LearnerPull, `${pull.apiUrl}/learner/pull`, { token: pull.token }, pull.publishableKey);
  if (questions.length === 0) throw new Error('The deck came back empty. Try another.');
  return { pull, cards: questions };
}

// The mark under a card: a wrong answer and a notice read the same in every deck.
export function Mark({ play, children }: { play: Play; children?: ReactNode }) {
  const { result, notice } = play;
  return (
    <p className={`mark ${result === 'right' ? 'right' : result || notice ? 'wrong' : ''}`} role="status">
      {result === 'wrong' ? 'Not quite. Try again.' : result === null ? notice : children}
    </p>
  );
}

// A typed answer and its Check button.
export function AnswerBox({ play, ...typing }: { play: Play } & InputHTMLAttributes<HTMLInputElement>) {
  const { input, answer, type, check, settled, busy } = play;
  return (
    <form className="answer" onSubmit={check}>
      <input
        ref={input}
        value={answer}
        onChange={(e) => type(e.target.value)}
        autoFocus
        {...typing}
        enterKeyHint={settled ? 'next' : 'go'}
        autoComplete="off"
        aria-label="Your answer"
      />
      {!settled && (
        <button className="primary" type="submit" disabled={busy}>
          Check
        </button>
      )}
    </form>
  );
}

// Next card once the card is settled; until then Skip and the app's own moves.
export function Moves({ play, children }: { play: Play; children?: ReactNode }) {
  return (
    <div className="row">
      {play.settled ? (
        <button key="next" onClick={play.next}>
          Next card
        </button>
      ) : (
        <>
          <button key="skip" onClick={play.skip} disabled={play.busy}>
            Skip
          </button>
          {children}
        </>
      )}
    </div>
  );
}

export function useDeck(deck: DeckView, firstPull: Promise<Pull | null>): Play {
  const cardMs = deck.cardSeconds * 1000;
  const newDeck = async () => cardsFor(await post(Pull, '/api/deck', { deck: deck.slug }));
  const [pull, setPull] = useState<Pull | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [queue, setQueue] = useState<number[]>([]);
  const [stage, setStage] = useState<Stage>({ name: 'idle' });
  const [answer, setAnswer] = useState('');
  const [revealed, setRevealed] = useState('');
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
  const settled = stage.name === 'card' && (stage.result === 'right' || stage.result === 'shown');

  function show(at: number) {
    showings.current += 1;
    late.current = false;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => expire.current(), cardMs);
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
    const made = await firstPull;
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
      setPull(loaded.pull);
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
    if (stage.name !== 'card' || !pull) return;
    const card = cards[stage.at];
    setProblem('');
    inFlight.current = true;
    setBusy(true);
    let result: Result = null;
    try {
      const { marks } = await post(
        LearnerChecked,
        `${pull.apiUrl}/learner/check`,
        { token: pull.token, by_question: [{ question: card.id, answer: given }] },
        pull.publishableKey,
      );
      const found = marks.find((m) => m.question === card.id);
      if (!found) throw new Error('The check came back without a mark for this card.');
      result = found.correct ? 'right' : found.type === 'number' && found.value == null ? 'unread' : 'wrong';
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

  // Giving up shows the card's answer, counts as a mistake, and sends the
  // card to the back of the deck when the learner moves on.
  async function giveUp(answerOf: (pull: Pull, card: Card) => Promise<string>) {
    if (stage.name !== 'card' || !pull || inFlight.current || settled) return;
    setProblem('');
    inFlight.current = true;
    setBusy(true);
    try {
      const shown = await answerOf(pull, cards[stage.at]);
      clearTimeout(timer.current);
      setMistakes((n) => n + 1);
      setRevealed(shown);
      setStage({ ...stage, result: 'shown' });
      input.current?.focus();
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  expire.current = () => {
    if (stage.name !== 'card' || settled) return;
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
    if (settled) return next();
    send(answer.trim());
  }

  // A shown card goes to the back of the deck; a right one is done.
  function next() {
    if (stage.name !== 'card') return;
    if (stage.result === 'shown') later(stage.at, false);
    else advance();
  }

  function send(given: string) {
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
    setFinish({ deck: decks.current, ms: Math.round(performance.now() - startedAt.current) + mistakes * deck.mistakeSeconds * 1000, mistakes });
    setStage({ name: 'done' });
  }

  return {
    deck,
    stage: stage.name,
    card: stage.name === 'card' ? cards[stage.at] : null,
    result: stage.name === 'card' ? stage.result : null,
    shown: revealed,
    answer,
    input,
    busy,
    notice,
    settled,
    type: (typed) => {
      if (!settled) setAnswer(typed);
    },
    check,
    next,
    skip: () => {
      if (stage.name === 'card') later(stage.at, false);
    },
    giveUp: (answerOf) => void giveUp(answerOf),
    view: { cards: cards.length, finished, showing: stage.name === 'card' ? stage.showing : 0, problem, firstTry, cameBack, finish, start: () => void start() },
  };
}

// The deck's panels: Start, the card with its progress and timer around the
// app's face (`children`), the finished deck, the boards, and any problem.
export default function Deck({ play, children }: { play: Play; children: ReactNode }) {
  const { deck, stage, busy, settled } = play;
  const { cards, finished, showing, problem, firstTry, cameBack, finish, start } = play.view;
  const cardMs = deck.cardSeconds * 1000;
  return (
    <>
      {(stage === 'idle' || stage === 'loading') && (
        <section className="panel">
          <button className="primary" onClick={start} disabled={busy}>
            {stage === 'loading' ? 'Making your deck…' : 'Start a deck'}
          </button>
          <p className="hint">{secondsWord(deck.cardSeconds)} a card. A card you miss comes back later, until you have every one right.</p>
        </section>
      )}

      {stage === 'card' && (
        <section className="panel deck" aria-live="polite">
          <p className="progress">
            Card {finished + 1} of {cards}
          </p>
          <div className={`timer ${settled ? 'stopped' : ''}`} role="timer" aria-label={`${secondsWord(deck.cardSeconds)} a card`}>
            <div className="timer-fill" key={showing} style={{ animationDuration: `${cardMs}ms` }} />
          </div>
          {children}
        </section>
      )}

      {stage === 'done' && (
        <section className="panel">
          <p className="score">
            {firstTry} of {cards} right on the first try
          </p>
          {finish && (
            <p className="total" data-testid="time">
              Time {seconds(finish.ms)}
              {finish.mistakes > 0 && (
                <span className="hint">
                  {' '}
                  ({seconds(finish.ms - finish.mistakes * deck.mistakeSeconds * 1000)} plus {finish.mistakes === 1 ? '1 mistake' : `${finish.mistakes} mistakes`} ×{' '}
                  {deck.mistakeSeconds} s)
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

      {stage !== 'card' && <Boards deck={deck} finish={stage === 'done' ? finish : null} />}

      {problem && (
        <p className="problem" role="alert">
          {problem}
        </p>
      )}
    </>
  );
}
