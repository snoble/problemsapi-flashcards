import { ProblemsApiError, newDeck } from '@/lib/problemsapi';

export async function POST() {
  try {
    return Response.json(await newDeck());
  } catch (e) {
    if (!(e instanceof ProblemsApiError)) throw e;
    console.error(`deck: ${e.message}`);
    const retry = e.status === 503 || e.status === 429;
    return Response.json(
      { error: retry ? 'The question service is busy. Try again in a moment.' : 'A deck could not be made just now.' },
      { status: retry ? 503 : 502 },
    );
  }
}
