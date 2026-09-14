import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@worthlane/db";
import { getAuthUser } from "@/lib/auth";
import { captureServerEvent } from "@/lib/posthog";
import { ok, err, unauthorized, notFound } from "@/lib/response";
import { positiveMoneyAmount } from "@/lib/validation";

const createSchema = z.object({
  amount: positiveMoneyAmount,
  note: z.string().optional(),
});

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const goal = await prisma.goal.findFirst({ where: { id: params.id, userId } });
  if (!goal) return notFound("Goal not found");

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return err("Invalid request body");

  const { amount, note } = parsed.data;

  const remaining = goal.targetAmount.toNumber() - goal.currentAmount.toNumber();
  if (remaining <= 0) return err("Goal is already complete", 400);
  if (amount > remaining) {
    return err(`Contribution exceeds remaining goal amount of $${remaining.toFixed(2)}`, 400);
  }

  // The overshoot guard lives inside the update itself so concurrent
  // contributions can't both pass the check above and exceed the target.
  const result = await prisma.$transaction(async (tx) => {
    const guarded = await tx.goal.updateMany({
      where: {
        id: params.id,
        userId,
        currentAmount: { lte: goal.targetAmount.toNumber() - amount },
      },
      data: { currentAmount: { increment: amount } },
    });
    if (guarded.count === 0) return null;

    const contribution = await tx.goalContribution.create({
      data: { goalId: params.id, userId, amount, note },
    });
    const updatedGoal = await tx.goal.findUniqueOrThrow({ where: { id: params.id } });
    return { contribution, updatedGoal };
  });

  if (!result) {
    return err("Contribution exceeds the remaining goal amount.", 409);
  }
  const { contribution, updatedGoal } = result;

  await captureServerEvent({
    distinctId: userId,
    event: "goal contribution added",
    properties: {
      goalId: params.id,
      contributionId: contribution.id,
      amount,
      hasNote: Boolean(note?.trim()),
      goalProgressAmount: updatedGoal.currentAmount.toNumber(),
    },
  });

  return ok({ contribution, goal: updatedGoal }, 201);
}

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const goal = await prisma.goal.findFirst({ where: { id: params.id, userId } });
  if (!goal) return notFound("Goal not found");

  const contributions = await prisma.goalContribution.findMany({
    where: { goalId: params.id },
    orderBy: { createdAt: "desc" },
  });

  return ok(contributions);
}
