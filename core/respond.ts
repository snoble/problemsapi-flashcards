import { BoardError } from './boards';

export async function respond(work: () => Promise<unknown>): Promise<Response> {
  try {
    const board = await work();
    return board === null ? Response.json({ error: 'That board does not exist.' }, { status: 404 }) : Response.json(board);
  } catch (e) {
    if (e instanceof BoardError) return Response.json({ error: e.message }, { status: e.status });
    console.error('boards:', e);
    return Response.json({ error: 'Scoreboards are not available just now.' }, { status: 503 });
  }
}
