import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@finance/db";
import { getAuthUser } from "@/lib/auth";
import { ok, err, unauthorized, notFound } from "@/lib/response";

const createSchema = z.object({
  amount: z.number().positive(),
  note: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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

  const [contribution, updatedGoal] = await prisma.$transaction([
    prisma.goalContribution.create({
      data: { goalId: params.id, userId, amount, note },
    }),
    prisma.goal.update({
      where: { id: params.id },
      data: { currentAmount: { increment: amount } },
    }),
  ]);

  return ok({ contribution, goal: updatedGoal }, 201);
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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
