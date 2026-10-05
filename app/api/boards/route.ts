import { createBoard } from '@/lib/boards';
import { respond } from '@/lib/respond';

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  return respond(() => createBoard(body));
}
