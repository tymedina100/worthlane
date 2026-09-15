import { Prisma, prisma } from '@worthlane/db';
import { HouseholdConflictError, HouseholdNotFoundError, HouseholdValidationError } from './household';

type Client = Prisma.TransactionClient;
async function scope(tx: Client, userId: string, lock = false) {
  const member = await tx.householdMember.findFirst({ where: { userId, status: 'ACTIVE' } });
  if (!member) throw new HouseholdNotFoundError('Household not found');
  if (lock) await tx.$queryRaw`SELECT id FROM "Household" WHERE id = ${member.householdId} FOR UPDATE`;
  const members = await tx.householdMember.findMany({ where: { householdId: member.householdId, status: 'ACTIVE' } });
  if (!members.some(row => row.id === member.id)) throw new HouseholdNotFoundError('Household not found');
  const accounts = await tx.account.findMany({
    where: { userId: { in: members.flatMap(row => row.userId ? [row.userId] : []) }, source: 'PLAID' },
    include: { householdAccesses: { where: { householdId: member.householdId } } },
  });
  const visible = accounts.filter(account => account.userId === userId || account.householdAccesses.some(access => access.memberId === member.id && access.visibility === 'SHARED'));
  return { member, members, accounts, visible };
}

export async function listAccountMatches(userId: string) {
  return prisma.$transaction(async tx => {
    const { member, members, visible } = await scope(tx, userId);
    const ids = visible.map(account => account.id);
    const matches = await tx.householdAccountMatch.findMany({ where: { householdId: member.householdId, firstAccountId: { in: ids }, secondAccountId: { in: ids } }, orderBy: { createdAt: 'asc' } });
    return {
      accounts: visible.map(account => ({ id: account.id, name: account.name, type: account.type, isOwner: account.userId === userId, ownerName: members.find(member => member.userId === account.userId)!.displayName })),
      matches: matches.map(match => ({
        id: match.id, firstAccountId: match.firstAccountId, secondAccountId: match.secondAccountId,
        status: match.firstConfirmedAt && match.secondConfirmedAt ? 'CONFIRMED' : 'PENDING',
        canConfirm: visible.some(account => account.userId === userId && ((account.id === match.firstAccountId && !match.firstConfirmedAt) || (account.id === match.secondAccountId && !match.secondConfirmedAt))),
      })),
    };
  });
}

export async function confirmAccountMatch(userId: string, accountId: string, otherAccountId: string) {
  if (accountId === otherAccountId) throw new HouseholdValidationError('Choose two separate connections');
  const [firstAccountId, secondAccountId] = [accountId, otherAccountId].sort();
  return prisma.$transaction(async tx => {
    const { member, members, visible } = await scope(tx, userId, true);
    const first = visible.find(account => account.id === firstAccountId);
    const second = visible.find(account => account.id === secondAccountId);
    if (!first || !second || (first.userId !== userId && second.userId !== userId)) throw new HouseholdNotFoundError('Account not found');
    // Both owners must be able to review both connections before either consents.
    for (const account of [first, second]) {
      const otherOwner = members.find(row => row.userId === (account.id === first.id ? second.userId : first.userId))!;
      if (account.userId !== otherOwner.userId && !account.householdAccesses.some(access => access.memberId === otherOwner.id && access.visibility === 'SHARED')) throw new HouseholdValidationError('Both owners must share account detail before confirming a match');
    }
    if (first.type !== second.type) throw new HouseholdValidationError('These connections have different account types');
    if (first.bankIdentity && second.bankIdentity) throw new HouseholdValidationError(first.bankIdentity === second.bankIdentity ? 'This bank already confirms these are the same account' : 'The bank identifies these as different accounts');
    const existing = await tx.householdAccountMatch.findUnique({ where: { householdId_firstAccountId_secondAccountId: { householdId: member.householdId, firstAccountId, secondAccountId } } });
    const otherMatch = await tx.householdAccountMatch.findFirst({ where: { householdId: member.householdId, ...(existing ? { id: { not: existing.id } } : {}), OR: [{ firstAccountId: { in: [firstAccountId, secondAccountId] } }, { secondAccountId: { in: [firstAccountId, secondAccountId] } }] } });
    if (otherMatch) throw new HouseholdConflictError('Remove the existing match before choosing a different connection');
    const now = new Date();
    const confirmations = { ...(first.userId === userId ? { firstConfirmedAt: existing?.firstConfirmedAt ?? now } : {}), ...(second.userId === userId ? { secondConfirmedAt: existing?.secondConfirmedAt ?? now } : {}) };
    const match = await tx.householdAccountMatch.upsert({
      where: { householdId_firstAccountId_secondAccountId: { householdId: member.householdId, firstAccountId, secondAccountId } },
      create: { householdId: member.householdId, firstAccountId, secondAccountId, ...confirmations }, update: confirmations,
    });
    await tx.household.update({ where: { id: member.householdId }, data: { updatedAt: now } });
    return { id: match.id, status: match.firstConfirmedAt && match.secondConfirmedAt ? 'CONFIRMED' : 'PENDING' };
  });
}

export async function revokeAccountMatch(userId: string, id: string) {
  return prisma.$transaction(async tx => {
    const { member } = await scope(tx, userId, true);
    const match = await tx.householdAccountMatch.findFirst({ where: { id, householdId: member.householdId, OR: [{ firstAccount: { userId } }, { secondAccount: { userId } }] } });
    if (!match) throw new HouseholdNotFoundError('Match not found');
    await tx.householdAccountMatch.delete({ where: { id } });
    await tx.household.update({ where: { id: member.householdId }, data: { updatedAt: new Date() } });
    return { revoked: true };
  });
}
