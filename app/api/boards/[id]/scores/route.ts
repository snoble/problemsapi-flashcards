import type { NextRequest } from 'next/server';

import { addScore } from '@/lib/boards';
import { respond } from '@/lib/respond';

export async function POST(request: NextRequest, ctx: RouteContext<'/api/boards/[id]/scores'>) {
  const { id } = await ctx.params;
  const body: unknown = await request.json().catch(() => null);
  return respond(() => addScore(id, body));
}
