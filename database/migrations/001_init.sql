-- EzanVakti571 — ilk şema (PostgreSQL 15+)
-- İlkeler:
--  * Kullanıcıya ait her tablo user_id taşır ve kullanıcı silinince ON DELETE CASCADE ile temizlenir (KVKK silme hakkı).
--  * İçerik tabloları (Kur'an, hadis, dua …) her kayıtta kaynak ve lisans kaydına (content_licenses) bağlıdır.
--  * Satır düzeyi güvenlik (RLS) kullanıcı tablolarında açıktır; uygulama her istekte
--    SET LOCAL app.user_id = '<uuid>' çalıştırır. Yönetici/ içe aktarma rolü ayrı tutulur.

-- gen_random_uuid() PostgreSQL 13+ çekirdeğinde bulunur; ek eklenti gerekmez.

-- ---------- içerik kaynakları ve lisanslar ----------
CREATE TABLE content_licenses (
  id            SERIAL PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,            -- ör. 'cc-by-4.0', 'tanzil-verbatim', 'diyanet-permission-2026'
  title         TEXT NOT NULL,
  url           TEXT,
  allows_redistribution BOOLEAN NOT NULL,
  requires_attribution  BOOLEAN NOT NULL DEFAULT TRUE,
  notes         TEXT,
  verified_at   DATE                              -- hukuki inceleme tarihi; NULL = doğrulanmadı
);

CREATE TABLE source_documents (
  id           SERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  publisher    TEXT,
  url          TEXT,
  edition      TEXT,                              -- hadis numaraları baskıya göre değişebilir
  license_id   INT NOT NULL REFERENCES content_licenses(id),
  retrieved_at DATE NOT NULL,
  checksum_sha256 TEXT,                           -- içe aktarılan dosyanın bütünlük özeti
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- konumlar ----------
CREATE TABLE locations (
  id            BIGSERIAL PRIMARY KEY,
  country_code  CHAR(2) NOT NULL DEFAULT 'TR',
  level         TEXT NOT NULL CHECK (level IN ('province','district','settlement')),
  parent_id     BIGINT REFERENCES locations(id) ON DELETE RESTRICT,
  code          TEXT,                             -- il için plaka kodu
  name          TEXT NOT NULL,
  name_folded   TEXT NOT NULL,                    -- Türkçe karaktersiz arama
  settlement_type TEXT,
  postal_codes  TEXT[] NOT NULL DEFAULT '{}',
  lat           DOUBLE PRECISION CHECK (lat BETWEEN -90 AND 90),
  lon           DOUBLE PRECISION CHECK (lon BETWEEN -180 AND 180),
  coord_quality TEXT CHECK (coord_quality IN ('geonames','override','province_center','inherited')),
  time_zone     TEXT NOT NULL DEFAULT 'Europe/Istanbul',
  diyanet_city_id INT,
  source_id     INT REFERENCES source_documents(id),
  valid_from    DATE,
  valid_to      DATE,                             -- idari değişikliklerde eski kayıt kapatılır, silinmez
  UNIQUE (country_code, level, parent_id, name_folded)
);
CREATE INDEX locations_search_idx ON locations (name_folded text_pattern_ops);
CREATE INDEX locations_parent_idx ON locations (parent_id);

-- ---------- namaz vakitleri ----------
CREATE TABLE prayer_calculation_methods (
  id          SERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,              -- 'diyanet-official', 'adhan-turkey'
  title       TEXT NOT NULL,
  is_official BOOLEAN NOT NULL DEFAULT FALSE,
  params      JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE prayer_times (
  location_id BIGINT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  method_id   INT NOT NULL REFERENCES prayer_calculation_methods(id),
  day         DATE NOT NULL,
  imsak TIME NOT NULL, gunes TIME NOT NULL, ogle TIME NOT NULL,
  ikindi TIME NOT NULL, aksam TIME NOT NULL, yatsi TIME NOT NULL,
  hijri_text  TEXT,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (location_id, method_id, day),
  CHECK (imsak < gunes AND gunes < ogle AND ogle < ikindi AND ikindi < aksam AND aksam < yatsi)
);

-- ---------- Kur'an ----------
CREATE TABLE quran_surahs (
  number      SMALLINT PRIMARY KEY CHECK (number BETWEEN 1 AND 114),
  name_ar     TEXT NOT NULL,
  name_tr     TEXT NOT NULL,
  verse_count SMALLINT NOT NULL CHECK (verse_count > 0),
  revelation  TEXT CHECK (revelation IN ('mekki','medeni'))
);

CREATE TABLE quran_verses (
  surah       SMALLINT NOT NULL REFERENCES quran_surahs(number),
  ayah        SMALLINT NOT NULL CHECK (ayah > 0),
  juz         SMALLINT NOT NULL CHECK (juz BETWEEN 1 AND 30),
  text_ar     TEXT NOT NULL,                     -- doğrulanmış kaynaktan, değiştirilmeden
  text_sha256 TEXT NOT NULL,
  source_id   INT NOT NULL REFERENCES source_documents(id),
  PRIMARY KEY (surah, ayah)
);

CREATE TABLE translations (
  id          SERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  language    TEXT NOT NULL,
  title       TEXT NOT NULL,
  source_id   INT NOT NULL REFERENCES source_documents(id)
);
CREATE TABLE translation_verses (
  translation_id INT NOT NULL REFERENCES translations(id) ON DELETE CASCADE,
  surah SMALLINT NOT NULL, ayah SMALLINT NOT NULL,
  text  TEXT NOT NULL,
  PRIMARY KEY (translation_id, surah, ayah),
  FOREIGN KEY (surah, ayah) REFERENCES quran_verses(surah, ayah)
);

CREATE TABLE tafsir_sources (
  id        SERIAL PRIMARY KEY,
  title     TEXT NOT NULL,
  author    TEXT,
  source_id INT NOT NULL REFERENCES source_documents(id)
);

CREATE TABLE recitations (
  id          SERIAL PRIMARY KEY,
  reciter     TEXT NOT NULL,
  style       TEXT,
  base_url    TEXT NOT NULL,
  allows_offline BOOLEAN NOT NULL DEFAULT FALSE,
  source_id   INT NOT NULL REFERENCES source_documents(id)
);

-- ---------- hadis, dua, zikir ----------
CREATE TABLE hadith_sources (
  id        SERIAL PRIMARY KEY,
  title     TEXT NOT NULL,                       -- ör. Sahîh-i Buhârî
  edition   TEXT,
  source_id INT NOT NULL REFERENCES source_documents(id)
);

CREATE TABLE hadith_entries (
  id          BIGSERIAL PRIMARY KEY,
  hadith_source_id INT NOT NULL REFERENCES hadith_sources(id),
  book        TEXT,
  number      TEXT NOT NULL,                     -- baskıya göre değişebilir
  text_ar     TEXT,
  text_tr     TEXT NOT NULL,
  grade       TEXT,                              -- kaynakta varsa; yoksa NULL (uydurulmaz)
  grade_by    TEXT,
  UNIQUE (hadith_source_id, book, number)
);

CREATE TABLE duas (
  id           BIGSERIAL PRIMARY KEY,
  category     TEXT NOT NULL,
  title        TEXT NOT NULL,
  text_ar      TEXT,
  transliteration_tr TEXT,
  meaning_tr   TEXT NOT NULL,
  reference    TEXT NOT NULL,                    -- ayet veya hadis künyesi zorunlu
  source_id    INT NOT NULL REFERENCES source_documents(id)
);

CREATE TABLE dhikr_entries (
  id         BIGSERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  text_ar    TEXT,
  meaning_tr TEXT,
  reference  TEXT,
  source_id  INT REFERENCES source_documents(id)
);

-- ---------- kullanıcılar (isteğe bağlı hesap) ----------
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  email_hash   TEXT UNIQUE,                      -- düz e-posta yerine özet (veri minimizasyonu)
  is_child_account BOOLEAN NOT NULL DEFAULT FALSE,
  parent_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  cloud_sync_consent_at TIMESTAMPTZ,             -- açık onay olmadan senkron yok
  deleted_at   TIMESTAMPTZ
);

CREATE TABLE user_settings (
  user_id    UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  settings   JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notification_preferences (
  user_id    UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  prefs      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bookmarks (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('verse','hadith','dua','location')),
  ref        TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, ref)
);

CREATE TABLE reading_progress (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  surah      SMALLINT NOT NULL,
  ayah       SMALLINT NOT NULL,
  read_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, read_at)
);

CREATE TABLE personal_notes (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ref        TEXT,
  body       TEXT NOT NULL CHECK (length(body) <= 10000),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ibadah_goals (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  target     INT NOT NULL CHECK (target >= 0),
  period     TEXT NOT NULL CHECK (period IN ('daily','weekly','monthly')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- yapay zekâ ----------
CREATE TABLE ai_conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  retain_until TIMESTAMPTZ NOT NULL DEFAULT now() + interval '90 days'   -- saklama süresi
);

CREATE TABLE ai_messages (
  id              BIGSERIAL PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content         TEXT NOT NULL,
  cited_sources   JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE feedback (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  message_id BIGINT REFERENCES ai_messages(id) ON DELETE SET NULL,
  rating     SMALLINT CHECK (rating IN (-1, 1)),
  comment    TEXT CHECK (length(comment) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- satır düzeyi güvenlik ----------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['user_settings','notification_preferences','bookmarks','reading_progress','personal_notes','ibadah_goals','ai_conversations']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY owner_only ON %I USING (user_id = current_setting('app.user_id', true)::uuid) WITH CHECK (user_id = current_setting('app.user_id', true)::uuid)$p$, t);
  END LOOP;
END $$;

ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages FORCE ROW LEVEL SECURITY;
CREATE POLICY owner_only ON ai_messages USING (
  conversation_id IN (SELECT id FROM ai_conversations WHERE user_id = current_setting('app.user_id', true)::uuid)
);
