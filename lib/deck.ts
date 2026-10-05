import { postJson } from './request';
import { Deck, LearnerPull, type Card } from './schemas';

export type Loaded = { deck: Deck; cards: Card[] };

export async function withCards(deck: Deck): Promise<Loaded> {
  const { questions } = await postJson(
    new URL('/learner/pull', deck.apiUrl),
    { token: deck.token },
    LearnerPull,
    deck.publishableKey,
  );
  return { deck, cards: questions };
}

export async function fetchDeck(): Promise<Loaded> {
  return withCards(await postJson('/api/deck', {}, Deck));
}
