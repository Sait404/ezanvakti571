/**
 * Basit, sıralı SQL migrasyon çalıştırıcı. Her dosya tek işlemde uygulanır ve schema_migrations'a yazılır.
 * Kullanım: DATABASE_URL=... npm run migrate
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import pg from 'pg';

export type Exec = { query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> };

export const MIGRATIONS_DIR = new URL('../../database/migrations/', import.meta.url).pathname;

export async function migrate(db: Exec, dir = MIGRATIONS_DIR): Promise<string[]> {
  await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
  const done = new Set((await db.query('SELECT name FROM schema_migrations')).rows.map((r) => String(r.name)));
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  const applied: string[] = [];
  for (const f of files) {
    if (done.has(f)) continue;
    const sql = await readFile(join(dir, f), 'utf8');
    await db.query('BEGIN');
    try {
      await db.query(sql);
      await db.query('INSERT INTO schema_migrations (name) VALUES ($1)', [f]);
      await db.query('COMMIT');
      applied.push(f);
    } catch (e) {
      await db.query('ROLLBACK');
      throw new Error(`Migrasyon başarısız: ${f}: ${(e as Error).message}`);
    }
  }
  return applied;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL tanımlı değil.');
    process.exit(1);
  }
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const applied = await migrate(client);
    console.log(applied.length ? `Uygulandı: ${applied.join(', ')}` : 'Şema güncel.');
  } finally {
    await client.end();
  }
}
