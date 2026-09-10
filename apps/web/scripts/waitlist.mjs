import postgres from "postgres";
import { readFile, writeFile } from "node:fs/promises";

if (!process.env.WAITLIST_DATABASE_URL) throw new Error("Set WAITLIST_DATABASE_URL privately.");
const sql = postgres(process.env.WAITLIST_DATABASE_URL, { max: 1 });
try {
  const [command, output] = process.argv.slice(2);
  if (command === "init") {
    await sql.unsafe(await readFile(new URL("../sql/waitlist.sql", import.meta.url), "utf8"));
    console.log("Waitlist tables ready.");
  } else if (command === "export" && output) {
    const rows = await sql`SELECT email, created_at, consent_version FROM beta_waitlist ORDER BY created_at`;
    const cell = value => {
      const s = String(value);
      return '"' + (/^[=+@\-\t\r]/.test(s) ? "'" : "") + s.replaceAll('"', '""') + '"';
    };
    await writeFile(output, "email,created_at,consent_version\n" + rows.map(row =>
      [row.email, row.created_at.toISOString(), row.consent_version].map(cell).join(",")
    ).join("\n") + "\n", { mode: 0o600, flag: "wx" });
    console.log(`Exported ${rows.length} contacts to a private file. Addresses are not email-verified.`);
  } else if (command === "remove") {
    let input = "";
    for await (const chunk of process.stdin) input += chunk;
    await sql`DELETE FROM beta_waitlist WHERE email = ${input.trim().toLowerCase()}`;
    console.log("Removal processed.");
  } else throw new Error("Use init, export <new-private-file.csv>, or remove (email on stdin).");
} finally { await sql.end(); }
