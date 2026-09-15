import { personalLedger } from "@/lib/personal-ledger";
import { spendingWhere, incomeWhere } from "@/lib/spending-treatment";
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@worthlane/db";
import { getAuthUser } from "@/lib/auth";
import { err, unauthorized } from "@/lib/response";
import { checkRateLimit } from "@/lib/rate-limit";
import { startOfMonth } from "@/lib/dates";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  // Rate limit: 20 messages/hour per user
  const rl = checkRateLimit(`ai:${userId}`, 20, 60 * 60 * 1000);
  if (rl) return rl;

  const body = await req.json();
  const { message, conversationHistory = [] } = body as {
    message: string;
    conversationHistory: { role: "user" | "assistant"; content: string }[];
  };

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return err("message is required", 400);
  }

  // Fetch financial context
  const ledger = await personalLedger(userId);
  const now = new Date();
  const periodStart = startOfMonth(now);

  const [accounts, budgets, goals, streaks, topCategories, incomeAgg, spendingAgg] =
    await Promise.all([
      Promise.resolve(ledger.accounts),
      prisma.budget.findMany({ where: { userId }, include: { category: true } }),
      prisma.goal.findMany({ where: { userId } }),
      prisma.streak.findMany({ where: { userId } }),
      prisma.transaction.groupBy({
        by: ["categoryId"],
        where: { date: { gte: periodStart, lte: now }, ...spendingWhere, ...ledger.transactionWhere },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 5,
      }),
      prisma.transaction.aggregate({
        where: { date: { gte: periodStart, lte: now }, ...incomeWhere, ...ledger.transactionWhere },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { date: { gte: periodStart, lte: now }, ...spendingWhere, ...ledger.transactionWhere },
        _sum: { amount: true },
      }),
    ]);

  const netWorth = accounts.reduce((sum, a) => {
    const bal = a.currentBalance.toNumber();
    return sum + (a.type === "CREDIT" || a.type === "LOAN" ? -bal : bal);
  }, 0);

  const monthlyIncome = Math.abs(Number(incomeAgg._sum.amount ?? 0));
  const monthlySpending = Number(spendingAgg._sum.amount ?? 0);

  // Resolve category names
  const catIds = topCategories.map((t) => t.categoryId).filter(Boolean) as string[];
  const cats = await prisma.category.findMany({ where: { id: { in: catIds } } });
  const catMap = Object.fromEntries(cats.map((c) => [c.id, c.name]));

  const topCatStr = topCategories
    .filter((t) => t.categoryId)
    .map((t) => `${catMap[t.categoryId!] ?? "Unknown"}: $${Number(t._sum.amount ?? 0).toFixed(0)}`)
    .join(", ");

  const budgetsStr = budgets
    .map((b) => {
      const amount = b.amount.toNumber();
      return `${b.category.name}: $${amount.toFixed(0)}/mo`;
    })
    .join(", ");

  const goalsStr = goals
    .map((g) => {
      const pct = g.targetAmount.toNumber() > 0
        ? Math.round((g.currentAmount.toNumber() / g.targetAmount.toNumber()) * 100)
        : 0;
      return `${g.name} (${pct}% complete)`;
    })
    .join(", ");

  const streakStr = streaks
    .map((s) => {
      const label = s.type === "DAILY_CHECKIN" ? "Daily check-in"
        : s.type === "WEEKLY_ON_BUDGET" ? "On-budget"
        : "No-impulse";
      return `${label}: ${s.currentCount} day streak`;
    })
    .join(", ");

  const systemPrompt = `You are Worthlane AI, a personal financial assistant built into the Worthlane finance app. Be concise (2-4 sentences max), calm, and concrete. Explain the current plan and offer a practical next step without guilt, urgency, streak pressure, or assumptions about savings. Keep responsibility separate from who paid, and never infer partner activity that is not included in the provided context. Treat recurring predictions as estimates, not confirmed due dates. Never give investment advice or specific stock/fund recommendations. Never use markdown formatting, asterisks, bullet points, or any special symbols — respond in plain conversational text only.

The user's current financial snapshot:
- Net worth: $${netWorth.toFixed(0)}
- Monthly income: $${monthlyIncome.toFixed(0)} | Monthly spending: $${monthlySpending.toFixed(0)}
- Net this month: ${(monthlyIncome - monthlySpending) >= 0 ? "+" : ""}$${(monthlyIncome - monthlySpending).toFixed(0)}
- Active budgets: ${budgetsStr || "none set"}
- Goals: ${goalsStr || "none set"}
- Top spending categories this month: ${topCatStr || "no data yet"}
- Streaks: ${streakStr || "none active"}`;

  // Drop malformed/empty history entries (an aborted stream can leave an
  // empty assistant message, which the Anthropic API rejects).
  const sanitizedHistory = conversationHistory.filter(
    (m) =>
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string" &&
      m.content.trim().length > 0
  );

  const messages: Anthropic.MessageParam[] = [
    ...sanitizedHistory,
    { role: "user", content: message.trim() },
  ];

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 512,
          system: systemPrompt,
          messages,
        });

        for await (const chunk of response) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            const data = JSON.stringify({ token: chunk.delta.text });
            controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
          }
        }

        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        controller.close();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "AI error";
        // Log full error details to server logs for debugging
        console.error("[AI chat] Anthropic error:", e);
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify({ error: msg })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
