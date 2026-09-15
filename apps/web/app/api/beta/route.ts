import { saveSignup } from "@/lib/waitlist";

export const runtime = "nodejs";
function reply(message: string, status: number) {
  return Response.json({ message }, { status, headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return reply("Please submit from the Worthlane website.", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return reply("Please use the signup form.", 415);
  // Bound streamed bodies too; Content-Length alone is not sufficient.
  const reader = request.body?.getReader();
  if (!reader) return reply("Please check your email and consent.", 400);
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.length;
    if (bytes > 2048) { await reader.cancel(); return reply("Submission too large.", 413); }
    chunks.push(value);
  }
  let body;
  try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { return reply("Please check your email and consent.", 400); }
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email) || body?.consent !== true)
    return reply("Enter a valid email and agree to beta emails.", 400);
  const success = "You’re on the list. We’ll email you when there’s a beta invitation or availability update.";
  if (body.website) return reply(success, 200);
  try {
    // Vercel supplies this header; do not trust arbitrary forwarded headers.
    const address = process.env.VERCEL === "1"
      ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
      : "local-preview";
    if (!address) throw new Error("Missing request address");
    if (!await saveSignup(email, address)) return reply("Too many attempts. Please try again in an hour.", 429);
    return reply(success, 200);
  } catch {
    // Do not log addresses, request bodies, or database error details.
    return reply("We couldn’t save your email right now. Please try again later, or contact support@worthlane.app.", 503);
  }
}
