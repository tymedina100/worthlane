import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';
import { confirmAccountMatch, listAccountMatches, revokeAccountMatch } from '@/lib/account-matches';
import { householdErrorResponse } from '@/lib/household-http';
import { err, ok, unauthorized } from '@/lib/response';

async function handle(req: NextRequest, action: 'list' | 'confirm' | 'revoke') {
  let userId: string;
  try { userId = getAuthUser(req).sub; } catch { return unauthorized(); }
  try {
    if (action === 'list') return ok(await listAccountMatches(userId));
    const body = await req.json().catch(() => null);
    if (action === 'revoke') {
      const parsed = z.object({ id: z.string().min(1) }).strict().safeParse(body);
      if (!parsed.success) return err('Invalid request body');
      return ok(await revokeAccountMatch(userId, parsed.data.id));
    }
    const parsed = z.object({ accountId: z.string().min(1), otherAccountId: z.string().min(1), confirmedSameAccount: z.literal(true) }).strict().safeParse(body);
    if (!parsed.success) return err('Confirm that both connections represent the same real bank account');
    return ok(await confirmAccountMatch(userId, parsed.data.accountId, parsed.data.otherAccountId));
  } catch (error) { return householdErrorResponse(error, 'households/current/account-matches', 'Unable to update account match', 'ACCOUNT_MATCH_FAILED'); }
}
export const GET = (req: NextRequest) => handle(req, 'list');
export const POST = (req: NextRequest) => handle(req, 'confirm');
export const DELETE = (req: NextRequest) => handle(req, 'revoke');
