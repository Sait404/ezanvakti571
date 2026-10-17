/**
 * Diyanet İşleri Başkanlığı "Awqat Salah" API istemcisi.
 *
 * Uç noktalar ve kimlik doğrulama akışı, açık kaynak pydiyanet istemcisinden (PyPI) doğrulanmıştır:
 *   POST {base}/Auth/Login            {email,password} → data.accessToken / data.refreshToken
 *   GET  {base}/Auth/RefreshToken/{refreshToken}
 *   GET  {base}/api/PrayerTime/Daily/{cityId}      (Bearer)
 *   GET  {base}/api/Place/Countries | States/{countryId} | Cities/{stateId}
 * Erişim tokeni ~30 dk, yenileme tokeni ~45 dk geçerlidir.
 *
 * ÖNEMLİ: Bu geliştirme ortamından Diyanet sunucusuna ağ erişimi YOKTU; yanıt alan adları
 * (fajr, sunrise, dhuhr, asr, maghrib, isha, gregorianDateShort, hijriDateLong …) canlı API ile
 * doğrulanmamıştır. Bu nedenle yanıt zod ile sıkı doğrulanır; beklenmeyen biçimde hata verilir
 * ve uygulama yanlış veri göstermek yerine cihaz hesabına düşer. Canlı kimlik bilgileriyle
 * `npm run sync:diyanet-places` çalıştırılarak doğrulanmalıdır (docs/DIYANET.md).
 */
import { z } from 'zod';

const HHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const TokenResp = z.object({
  success: z.literal(true),
  data: z.object({ accessToken: z.string().min(10), refreshToken: z.string().min(10) }),
});

const DayRow = z
  .object({
    fajr: HHMM,
    sunrise: HHMM,
    dhuhr: HHMM,
    asr: HHMM,
    maghrib: HHMM,
    isha: HHMM,
    gregorianDateShort: z.string().optional(),
    gregorianDateShortIso8601: z.string().optional(),
    gregorianDateLongIso8601: z.string().optional(),
    hijriDateLong: z.string().optional(),
  })
  .loose();

const DailyResp = z.object({ success: z.literal(true), data: z.array(DayRow).min(1) });
const PlaceResp = z.object({ success: z.literal(true), data: z.array(z.object({ id: z.number(), name: z.string() }).loose()) });

export type OfficialDay = {
  date: string;
  times: { imsak: string; gunes: string; ogle: string; ikindi: string; aksam: string; yatsi: string };
  hijri?: string;
};

/** "17.10.2026" | "2026-10-17T00:00:00" → "2026-10-17" */
export function normalizeDate(row: z.infer<typeof DayRow>): string {
  const iso = row.gregorianDateShortIso8601 ?? row.gregorianDateLongIso8601;
  if (iso && /^\d{4}-\d{2}-\d{2}/.test(iso)) return iso.slice(0, 10);
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(row.gregorianDateShort ?? '');
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  throw new Error('Diyanet yanıtında tarih alanı tanınmadı.');
}

export type FetchFn = typeof fetch;

export class DiyanetClient {
  private access?: { token: string; exp: number };
  private refresh?: { token: string; exp: number };

  constructor(
    private readonly opts: { baseUrl: string; email: string; password: string; fetchImpl?: FetchFn; now?: () => number; timeoutMs?: number },
  ) {}

  private get f(): FetchFn {
    return this.opts.fetchImpl ?? fetch;
  }
  private now() {
    return (this.opts.now ?? Date.now)();
  }

  private async req(path: string, init: RequestInit = {}): Promise<Response> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.opts.timeoutMs ?? 10_000);
    try {
      return await this.f(`${this.opts.baseUrl.replace(/\/$/, '')}${path}`, { ...init, signal: ctrl.signal });
    } finally {
      clearTimeout(t);
    }
  }

  private setTokens(d: { accessToken: string; refreshToken: string }) {
    const n = this.now();
    this.access = { token: d.accessToken, exp: n + 29 * 60_000 };
    this.refresh = { token: d.refreshToken, exp: n + 44 * 60_000 };
  }

  async login(): Promise<void> {
    const r = await this.req('/Auth/Login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: this.opts.email, password: this.opts.password }),
    });
    if (!r.ok) throw new Error(`Diyanet giriş başarısız (HTTP ${r.status}).`);
    this.setTokens(TokenResp.parse(await r.json()).data);
  }

  private async ensureToken(): Promise<string> {
    const n = this.now();
    if (this.access && n < this.access.exp) return this.access.token;
    if (this.refresh && n < this.refresh.exp) {
      const r = await this.req(`/Auth/RefreshToken/${encodeURIComponent(this.refresh.token)}`);
      if (r.ok) {
        const p = TokenResp.safeParse(await r.json());
        if (p.success) {
          this.setTokens(p.data.data);
          return this.access!.token;
        }
      }
    }
    await this.login();
    return this.access!.token;
  }

  private async authedGet(path: string): Promise<unknown> {
    let token = await this.ensureToken();
    let r = await this.req(path, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
    if (r.status === 401) {
      this.access = undefined;
      token = await this.ensureToken();
      r = await this.req(path, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
    }
    if (!r.ok) throw new Error(`Diyanet isteği başarısız (HTTP ${r.status}).`);
    return r.json();
  }

  async daily(cityId: number): Promise<OfficialDay[]> {
    const body = DailyResp.parse(await this.authedGet(`/api/PrayerTime/Daily/${cityId}`));
    return body.data.map((row) => ({
      date: normalizeDate(row),
      times: { imsak: row.fajr, gunes: row.sunrise, ogle: row.dhuhr, ikindi: row.asr, aksam: row.maghrib, yatsi: row.isha },
      hijri: row.hijriDateLong,
    }));
  }

  async countries() {
    return PlaceResp.parse(await this.authedGet('/api/Place/Countries')).data;
  }
  async states(countryId: number) {
    return PlaceResp.parse(await this.authedGet(`/api/Place/States/${countryId}`)).data;
  }
  async cities(stateId: number) {
    return PlaceResp.parse(await this.authedGet(`/api/Place/Cities/${stateId}`)).data;
  }
}
