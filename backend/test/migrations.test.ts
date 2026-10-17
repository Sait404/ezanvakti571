/**
 * Migrasyonlar gerçek PostgreSQL motoru (PGlite — WASM derlenmiş Postgres) üzerinde denenir.
 */
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { migrate } from '../scripts/migrate.js';

let db: PGlite;
const exec = { query: async (sql: string, params?: unknown[]) => (params ? db.query(sql, params) : db.exec(sql).then((r) => r[r.length - 1] ?? { rows: [] })) as Promise<{ rows: Record<string, unknown>[] }> };

beforeAll(async () => {
  db = new PGlite();
  await migrate(exec);
  await db.exec(`CREATE ROLE app_user NOLOGIN; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user; GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;`);
}, 60_000);

async function asUser<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(`SET ROLE app_user; SELECT set_config('app.user_id', '${userId}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec('RESET ROLE;');
  }
}

describe('Veritabanı şeması', () => {
  it('istenen tüm tablolar oluşur ve migrasyon tekrar çalıştırılınca bir şey yapmaz', async () => {
    const r = await db.query<{ table_name: string }>(`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`);
    const names = new Set(r.rows.map((x) => x.table_name));
    for (const t of ['users', 'user_settings', 'locations', 'prayer_times', 'prayer_calculation_methods', 'quran_surahs', 'quran_verses', 'translations', 'tafsir_sources', 'recitations', 'hadith_sources', 'hadith_entries', 'duas', 'dhikr_entries', 'bookmarks', 'reading_progress', 'personal_notes', 'ibadah_goals', 'notification_preferences', 'ai_conversations', 'ai_messages', 'source_documents', 'content_licenses', 'feedback']) {
      expect(names.has(t), t).toBe(true);
    }
    expect(await migrate(exec)).toEqual([]);
  });

  it('içerik kaydı kaynak/lisans olmadan eklenemez', async () => {
    await expect(db.query(`INSERT INTO duas (category,title,meaning_tr,reference,source_id) VALUES ('x','y','z','r', 999)`)).rejects.toThrow();
  });

  it('namaz vakti sırası tutarsızsa reddedilir', async () => {
    await db.exec(`INSERT INTO locations (level,name,name_folded,lat,lon) VALUES ('province','Mardin','mardin',37.3,40.7);
                   INSERT INTO prayer_calculation_methods (code,title,is_official) VALUES ('diyanet-official','Diyanet',true);`);
    await expect(db.query(`INSERT INTO prayer_times (location_id,method_id,day,imsak,gunes,ogle,ikindi,aksam,yatsi) VALUES (1,1,'2026-10-17','06:00','05:00','12:00','15:00','18:00','19:00')`)).rejects.toThrow();
    await db.query(`INSERT INTO prayer_times (location_id,method_id,day,imsak,gunes,ogle,ikindi,aksam,yatsi) VALUES (1,1,'2026-10-17','05:01','06:24','12:08','15:13','17:42','19:00')`);
  });

  it('yetkisiz veri erişimi: kullanıcı başkasının notunu göremez/değiştiremez (RLS)', async () => {
    const r = await db.query<{ id: string }>(`INSERT INTO users DEFAULT VALUES RETURNING id`);
    const r2 = await db.query<{ id: string }>(`INSERT INTO users DEFAULT VALUES RETURNING id`);
    const [a, b] = [r.rows[0].id, r2.rows[0].id];
    await asUser(a, () => db.query(`INSERT INTO personal_notes (user_id, body) VALUES ($1, 'A notu')`, [a]));
    await asUser(b, () => db.query(`INSERT INTO personal_notes (user_id, body) VALUES ($1, 'B notu')`, [b]));
    const seenByB = await asUser(b, () => db.query<{ body: string }>(`SELECT body FROM personal_notes`));
    expect(seenByB.rows.map((x) => x.body)).toEqual(['B notu']);
    // B, A adına kayıt ekleyemez
    await expect(asUser(b, () => db.query(`INSERT INTO personal_notes (user_id, body) VALUES ($1, 'sahte')`, [a]))).rejects.toThrow();
    // B, A'nın notunu güncelleyemez (0 satır etkilenir)
    const upd = await asUser(b, () => db.query(`UPDATE personal_notes SET body='x' WHERE user_id=$1`, [a]));
    expect(upd.affectedRows ?? 0).toBe(0);
  });

  it('kullanıcı silinince tüm kişisel verileri silinir (KVKK)', async () => {
    const u = (await db.query<{ id: string }>(`INSERT INTO users DEFAULT VALUES RETURNING id`)).rows[0].id;
    await db.query(`INSERT INTO user_settings (user_id) VALUES ($1)`, [u]);
    await db.query(`INSERT INTO bookmarks (user_id, kind, ref) VALUES ($1,'verse','2:255')`, [u]);
    const c = (await db.query<{ id: string }>(`INSERT INTO ai_conversations (user_id) VALUES ($1) RETURNING id`, [u])).rows[0].id;
    await db.query(`INSERT INTO ai_messages (conversation_id, role, content) VALUES ($1,'user','soru')`, [c]);
    await db.query(`DELETE FROM users WHERE id=$1`, [u]);
    for (const [t, col] of [['user_settings', 'user_id'], ['bookmarks', 'user_id'], ['ai_conversations', 'user_id']] as const) {
      const n = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${t} WHERE ${col}=$1`, [u]);
      expect(n.rows[0].n).toBe(0);
    }
    const m = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM ai_messages WHERE conversation_id=$1`, [c]);
    expect(m.rows[0].n).toBe(0);
  });
});
