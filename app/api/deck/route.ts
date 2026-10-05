import { newDeck } from '../../../lib/problemsapi';
import { RequestError } from '../../../lib/request';

export async function POST() {
  try {
    return Response.json(await newDeck());
  } catch (e) {
    if (!(e instanceof RequestError)) throw e;
    console.error(`deck: ${e.message}`);
    const busy = e.status === 503 || e.status === 429;
    return Response.json(
      { error: busy ? 'The question service is busy. Try again in a moment.' : 'A deck could not be made just now.' },
      { status: busy ? 503 : 502 },
    );
  }
}
