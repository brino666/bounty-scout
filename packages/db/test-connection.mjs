// Standalone connection check — bypasses drizzle-kit's spinner UI so the
// real Postgres error (auth, network, SSL) actually shows up on screen.
// Usage: node packages/db/test-connection.mjs   (run from anywhere)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const here = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(here, "../../apps/api/.env");

try {
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
  console.log(`Loaded env from ${envPath}`);
} catch (err) {
  console.error(`Could not read ${envPath}:`, err.message);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set after loading .env — check the file.");
  process.exit(1);
}

console.log("Connecting to Postgres...");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();
  const result = await client.query("select version()");
  console.log("SUCCESS — connected. Server says:", result.rows[0].version);
  await client.end();
} catch (err) {
  console.error("CONNECTION FAILED:");
  console.error(err);
  process.exit(1);
}
