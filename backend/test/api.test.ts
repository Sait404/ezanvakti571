import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { DiyanetClient, normalizeDate } from '../src/diyanet/client.js';
import { placeKey, PrayerTimeService } from '../src/diyanet/service.js';
import { RateLimiter } from '../src/lib/rateLimit.js';

const baseConfig = loadConfig({ NODE_ENV: 'test', RATE_LIMIT_PER_MINUTE: '1000' });
const placeMap = { places: { [placeKey('47', 'Midyat')]: 9246 } };

const dayRow = (d: string) => ({ fajr: '05:01', sunrise: '06:24', dhuhr: '12:08', asr: '15:13', maghrib: '17:42', isha: '19:00', gregorianDateShort: d, hijriDateLong: '5 Cemaziyelevvel 1448' });

/** Diyanet API'sini taklit eden sahte fetch (gerçek ağ kullanılmaz). */
function fakeDiyanet(opts: { failDaily?: boolean; badShape?: boolean; expire401Once?: boolean } = {}) {
  const calls: string[] = [];
  let sent401 = false;
  const f = (async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    calls.push(`${init?.method ?? 'GET'} ${u.replace('https://diyanet.test', '')}`);
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    if (u.endsWith('/Auth/Login')) {
      const b = JSON.parse(String(init?.body));
      if (b.password !== 'dogru') return json(401, { success: false });
      return json(200, { success: true, data: { accessToken: 'access-token-123', refreshToken: 'refresh-token-123' } });
    }
    if (u.includes('/Auth/RefreshToken/')) return json(200, { success: true, data: { accessToken: 'access-token-456', refreshToken: 'refresh-token-456' } });
    if (u.includes('/api/PrayerTime/Daily/')) {
      if (opts.expire401Once && !sent401) {
        sent401 = true;
        return json(401, {});
      }
      if (opts.failDaily) return json(500, {});
      if (opts.badShape) return json(200, { success: true, data: [{ fajr: 'sabah' }] });
      return json(200, { success: true, data: [dayRow('17.10.2026'), dayRow('18.10.2026')] });
    }
    return json(404, {});
  }) as typeof fetch;
  return { f, calls };
}

const client = (f: typeof fetch, password = 'dogru') => new DiyanetClient({ baseUrl: 'https://diyanet.test', email: 'a@b.c', password, fetchImpl: f });

describe('API: genel', () => {
  it('/health çalışır ve resmî kaynak durumunu bildirir', async () => {
    const app = buildApp({ config: baseConfig, placeMap });
    const r = await app.inject('/health');
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ ok: true, officialSource: false });
  });

  it('Diyanet yapılandırılmamışsa 503 + standart hata gövdesi (asla sahte "diyanet" verisi yok)', async () => {
    const app = buildApp({ config: baseConfig, placeMap });
    const r = await app.inject('/v1/prayer-times?provinceCode=47&district=Midyat');
    expect(r.statusCode).toBe(503);
    expect(r.json().error).toMatchObject({ code: 'OFFICIAL_SOURCE_NOT_CONFIGURED' });
    expect(r.json().error.requestId).toBeTruthy();
  });

  it('girdi doğrulaması: geçersiz il kodu ve çok uzun ilçe adı 400', async () => {
    const app = buildApp({ config: baseConfig, placeMap });
    for (const q of ['provinceCode=99&district=X', 'provinceCode=47&district=' + 'a'.repeat(61), 'provinceCode=47', 'provinceCode=47&district=Midyat&days=500']) {
      const r = await app.inject(`/v1/prayer-times?${q}`);
      expect(r.statusCode).toBe(400);
      expect(r.json().error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('bilinmeyen uç nokta 404 standart gövde', async () => {
    const r = await buildApp({ config: baseConfig, placeMap }).inject('/admin');
    expect(r.statusCode).toBe(404);
    expect(r.json().error.code).toBe('NOT_FOUND');
  });

  it('güvenlik başlıkları ve izinsiz origin için CORS başlığı yok', async () => {
    const r = await buildApp({ config: baseConfig, placeMap }).inject({ url: '/health', headers: { origin: 'https://kotu.example' } });
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('API: hız sınırı', () => {
  it('dakikadaki sınır aşılınca 429 ve Retry-After', async () => {
    const app = buildApp({ config: loadConfig({ RATE_LIMIT_PER_MINUTE: '3' }), placeMap });
    const codes: number[] = [];
    for (let i = 0; i < 5; i++) codes.push((await app.inject('/v1/prayer-times?provinceCode=47&district=Midyat')).statusCode);
    expect(codes.slice(0, 3)).toEqual([503, 503, 503]);
    expect(codes.slice(3)).toEqual([429, 429]);
    const r = await app.inject('/v1/prayer-times?provinceCode=47&district=Midyat');
    expect(Number(r.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('pencere dolunca yeniden izin verir; IP düz metin saklanmaz', () => {
    let t = 0;
    const rl = new RateLimiter(2, 60_000, () => t);
    expect(rl.take('1.2.3.4').allowed).toBe(true);
    expect(rl.take('1.2.3.4').allowed).toBe(true);
    expect(rl.take('1.2.3.4').allowed).toBe(false);
    expect(rl.take('5.6.7.8').allowed).toBe(true);
    t = 61_000;
    expect(rl.take('1.2.3.4').allowed).toBe(true);
    expect(JSON.stringify([...(rl as unknown as { hits: Map<string, unknown> }).hits.keys()])).not.toContain('1.2.3.4');
  });
});

describe('Diyanet entegrasyonu (sahte sunucu ile)', () => {
  it('giriş + günlük vakit → istemcinin beklediği biçim', async () => {
    const fake = fakeDiyanet();
    const app = buildApp({ config: baseConfig, placeMap, diyanet: client(fake.f) });
    const r = await app.inject('/v1/prayer-times?provinceCode=47&district=midyat&start=2026-10-17&days=2');
    expect(r.statusCode).toBe(200);
    const b = r.json();
    expect(b.source).toBe('diyanet');
    expect(b.cityId).toBe(9246);
    expect(b.days).toHaveLength(2);
    expect(b.days[0]).toEqual({ date: '2026-10-17', times: { imsak: '05:01', gunes: '06:24', ogle: '12:08', ikindi: '15:13', aksam: '17:42', yatsi: '19:00' }, hijri: '5 Cemaziyelevvel 1448' });
    expect(fake.calls[0]).toBe('POST /Auth/Login');
  });

  it('önbellek: aynı şehir için ikinci istek Diyanet\'e gitmez', async () => {
    const fake = fakeDiyanet();
    const app = buildApp({ config: baseConfig, placeMap, diyanet: client(fake.f) });
    await app.inject('/v1/prayer-times?provinceCode=47&district=Midyat');
    await app.inject('/v1/prayer-times?provinceCode=47&district=Midyat');
    expect(fake.calls.filter((c) => c.includes('Daily'))).toHaveLength(1);
  });

  it('401 alınınca token yenilenip istek tekrarlanır', async () => {
    const fake = fakeDiyanet({ expire401Once: true });
    const days = await client(fake.f).daily(1);
    expect(days).toHaveLength(2);
    expect(fake.calls.filter((c) => c.includes('Daily'))).toHaveLength(2);
  });

  it('eşlemesi olmayan ilçe 404 PLACE_NOT_MAPPED', async () => {
    const app = buildApp({ config: baseConfig, placeMap, diyanet: client(fakeDiyanet().f) });
    const r = await app.inject('/v1/prayer-times?provinceCode=06&district=Çankaya');
    expect(r.json().error.code).toBe('PLACE_NOT_MAPPED');
  });

  it('Diyanet hata veya beklenmeyen şema döndürürse 502 (yanlış veri geçirilmez)', async () => {
    for (const o of [{ failDaily: true }, { badShape: true }]) {
      const app = buildApp({ config: baseConfig, placeMap, diyanet: client(fakeDiyanet(o).f) });
      const r = await app.inject('/v1/prayer-times?provinceCode=47&district=Midyat');
      expect(r.statusCode).toBe(502);
      expect(r.json().error.code).toBe('UPSTREAM_UNAVAILABLE');
    }
  });

  it('yanlış kimlik bilgisi 502 ile sonuçlanır ve parola yanıta/hataya sızmaz', async () => {
    const app = buildApp({ config: baseConfig, placeMap, diyanet: client(fakeDiyanet().f, 'gizli-yanlis') });
    const r = await app.inject('/v1/prayer-times?provinceCode=47&district=Midyat');
    expect(r.statusCode).toBe(502);
    expect(r.body).not.toContain('gizli-yanlis');
  });

  it('tarih biçimleri normalize edilir', () => {
    expect(normalizeDate({ ...dayRow('17.10.2026') })).toBe('2026-10-17');
    expect(normalizeDate({ ...dayRow(''), gregorianDateShortIso8601: '2026-10-18T00:00:00' })).toBe('2026-10-18');
  });

  it('eşzamanlı istekler tek Diyanet çağrısında birleşir', async () => {
    const fake = fakeDiyanet();
    const svc = new PrayerTimeService(client(fake.f), placeMap);
    await Promise.all([svc.daysFor(1), svc.daysFor(1), svc.daysFor(1)]);
    expect(fake.calls.filter((c) => c.includes('Daily'))).toHaveLength(1);
  });
});
