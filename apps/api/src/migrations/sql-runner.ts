import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

const MIGRATION_TABLE = "__corens_sql_migrations";

function resolveMigrationsDir(): string {
  return path.resolve(process.cwd(), "../../migrations");
}

async function ensureMigrationTable(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "${MIGRATION_TABLE}" (
      "filename" TEXT PRIMARY KEY,
      "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(client: Client): Promise<Set<string>> {
  const result = await client.query<{ filename: string }>(
    `SELECT "filename" FROM "${MIGRATION_TABLE}" ORDER BY "filename" ASC`
  );

  return new Set(result.rows.map((row: { filename: string }) => row.filename));
}

async function listMigrationFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

export async function runPendingSqlMigrations(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to run SQL migrations");
  }

  const migrationsDir = resolveMigrationsDir();
  const client = new Client({ connectionString });

  await client.connect();

  try {
    await ensureMigrationTable(client);

    const [appliedMigrations, migrationFiles] = await Promise.all([
      getAppliedMigrations(client),
      listMigrationFiles(migrationsDir)
    ]);

    for (const filename of migrationFiles) {
      if (appliedMigrations.has(filename)) {
        continue;
      }

      const sql = await readFile(path.join(migrationsDir, filename), "utf8");

      await client.query("BEGIN");

      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO "${MIGRATION_TABLE}" ("filename") VALUES ($1)`,
          [filename]
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`Failed to apply SQL migration ${filename}`, {
          cause: error
        });
      }
    }
  } finally {
    await client.end();
  }
}
