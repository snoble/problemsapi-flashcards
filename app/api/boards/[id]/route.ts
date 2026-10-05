import type { NextRequest } from 'next/server';

import { findBoard } from '@/lib/boards';
import { respond } from '@/lib/respond';

export async function GET(_request: NextRequest, ctx: RouteContext<'/api/boards/[id]'>) {
  const { id } = await ctx.params;
  return respond(() => findBoard(id));
}
