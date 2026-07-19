import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "./db.js";

const here = fileURLToPath(new URL("..", import.meta.url));
const migrationDir = join(here, "migrations");

await sql`CREATE TABLE IF NOT EXISTS app_migrations (
  name TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;

// Prevent two containers from applying migrations at the same time.
await sql`SELECT pg_advisory_lock(846221744)`;

try {
  const files = (await readdir(migrationDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const [existing] = await sql<{ name: string }[]>`
      SELECT name FROM app_migrations WHERE name = ${file}
    `;

    if (existing) {
      console.log(`Skipped ${file}; already applied.`);
      continue;
    }

    const migration = await readFile(join(migrationDir, file), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(migration);
      await tx`INSERT INTO app_migrations (name) VALUES (${file})`;
    });
    console.log(`Applied ${file}`);
  }
} finally {
  await sql`SELECT pg_advisory_unlock(846221744)`;
  await sql.end();
}
