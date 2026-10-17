import { describe, expect, it } from 'vitest';
import { computeRange } from '../src/features/prayer-times/calculate';
import { DEFAULT_NOTIFICATION_PREFS, MAX_PENDING, planNotifications, type NotificationPrefs } from '../src/features/notifications/planner';
import { qiblaBearing, turnAngle, turnInstruction, headingFromMagnetometer } from '../src/features/qibla/qibla';
import { addCounter, increment, removeCounter, resetActive, totals, dhikrStore, type DhikrState } from '../src/features/dhikr/store';
import { contrast, dark, light } from '../src/theme/tokens';
import { createPersistedStore } from '../src/utils/persistedStore';
import { exportAllLocalData, memoryStorage, wipeAllLocalData } from '../src/utils/storage';
import { formatHM } from '../src/utils/time';
import { qibla as adhanQibla } from './adhanQibla';

const TZ = 'Europe/Istanbul';

describe('Bildirim planlama', () => {
  const days = computeRange(41.01, 28.95, '2026-10-17', 14, TZ, { asr: 'asr_evvel' });
  const on: NotificationPrefs = { ...DEFAULT_NOTIFICATION_PREFS, enabled: true };

  it('kullanıcı açmadıkça hiçbir bildirim planlanmaz', () => {
    expect(planNotifications(days, DEFAULT_NOTIFICATION_PREFS, new Date('2026-10-17T00:00:00Z'), 'İstanbul')).toEqual([]);
  });

  it('geçmişte kalan vakitler planlanmaz; sıralı ve sınırlı', () => {
    const now = days[0].times.ikindi;
    const plan = planNotifications(days, on, now, 'İstanbul');
    expect(plan.length).toBeLessThanOrEqual(MAX_PENDING);
    expect(plan[0].fireAt.getTime()).toBeGreaterThan(now.getTime());
    expect(plan[0].prayer).toBe('aksam');
    for (let i = 1; i < plan.length; i++) expect(plan[i].fireAt.getTime()).toBeGreaterThanOrEqual(plan[i - 1].fireAt.getTime());
    expect(plan.every((p) => p.title.startsWith('EzanVakti571'))).toBe(true);
  });

  it('kapalı vakit (güneş) planlanmaz; vakit öncesi/sonrası hatırlatmalar eklenir', () => {
    const prefs: NotificationPrefs = { ...on, perPrayer: { ...on.perPrayer, aksam: { mode: 'sound', beforeMin: 15, afterMin: 10 } } };
    const plan = planNotifications(days.slice(0, 1), prefs, new Date('2026-10-16T21:00:00Z'), 'X');
    expect(plan.some((p) => p.prayer === 'gunes')).toBe(false);
    const ak = plan.filter((p) => p.prayer === 'aksam');
    expect(ak.map((p) => p.kind).sort()).toEqual(['after', 'at', 'before']);
    const at = ak.find((p) => p.kind === 'at')!.fireAt.getTime();
    expect(ak.find((p) => p.kind === 'before')!.fireAt.getTime()).toBe(at - 15 * 60_000);
  });

  it('sessiz saatlerde (23:00–06:00) imsak bildirimi sessize alınır', () => {
    const prefs: NotificationPrefs = { ...on, quietStart: '23:00', quietEnd: '06:00' };
    const plan = planNotifications(days.slice(0, 1), prefs, new Date('2026-10-16T21:00:00Z'), 'X');
    const imsak = plan.find((p) => p.prayer === 'imsak')!;
    expect(formatHM(imsak.fireAt, TZ) < '06:00').toBe(true);
    expect(imsak.sound).toBe(false);
    expect(plan.find((p) => p.prayer === 'ogle')!.sound).toBe(true);
  });

  it('vakitler değişince plan kimlikleri tarih bazlı olduğundan eskiler yenileriyle çakışmaz', () => {
    const p1 = planNotifications(days.slice(0, 2), on, new Date('2026-10-16T21:00:00Z'), 'X');
    const ids = new Set(p1.map((p) => p.id));
    expect(ids.size).toBe(p1.length);
    expect([...ids].every((id) => id.startsWith('ev571:2026-10-1'))).toBe(true);
  });
});

describe('Kıble', () => {
  it('bilinen değerlerle uyumlu (İstanbul ≈151.6°, Midyat ≈ 190°)', () => {
    expect(qiblaBearing(41.0138, 28.9497)).toBeCloseTo(151.6, 0);
    const midyat = qiblaBearing(37.419, 41.339);
    expect(midyat).toBeGreaterThan(185);
    expect(midyat).toBeLessThan(195);
  });

  it('adhan kütüphanesiyle çapraz doğrulama (81 il, ±0.01°)', async () => {
    const { provinces } = await import('../src/features/locations/data');
    for (const p of provinces) expect(Math.abs(qiblaBearing(p.lat, p.lon) - adhanQibla(p.lat, p.lon))).toBeLessThan(0.01);
  });

  it('dönüş açısı ve yönerge', () => {
    expect(turnAngle(350, 10)).toBe(20);
    expect(turnAngle(10, 350)).toBe(-20);
    expect(turnInstruction(2)).toBe('Kıble yönündesiniz.');
    expect(turnInstruction(-40)).toBe('40° sola dönün.');
    expect(headingFromMagnetometer(0, 1)).toBeCloseTo(0); // üst kenar kuzeye
    expect(headingFromMagnetometer(-1, 0)).toBeCloseTo(90); // üst kenar doğuya → kuzey solda
    expect(headingFromMagnetometer(1, 0)).toBeCloseTo(270);
    expect(headingFromMagnetometer(0, -1)).toBeCloseTo(180);
  });
});

describe('Tesbih sayacı', () => {
  const base = (): DhikrState => JSON.parse(JSON.stringify(dhikrStore.get()));

  it('sayar, hedefte bildirir, günlük toplam tutar', () => {
    let s = base();
    let reached = false;
    for (let i = 0; i < 33; i++) {
      const r = increment(s, new Date('2026-10-17T10:00:00Z'));
      s = r.next;
      reached = r.result.reachedTarget;
    }
    expect(reached).toBe(true);
    expect(s.counters.find((c) => c.id === 'subhanallah')!.count).toBe(33);
    expect(totals(s, new Date('2026-10-17T12:00:00Z')).today).toBe(33);
    expect(totals(s, new Date('2026-10-20T12:00:00Z')).last7).toBe(33);
    expect(totals(s, new Date('2026-10-30T12:00:00Z')).last7).toBe(0);
  });

  it('sıfırlama yalnızca etkin sayacı sıfırlar; özel zikir eklenir/silinir', () => {
    let s = increment(base(), new Date()).next;
    s = addCounter(s, '  Kendi zikrim  ', 100);
    expect(s.counters.at(-1)!.name).toBe('Kendi zikrim');
    s = increment(s, new Date()).next;
    s = resetActive(s);
    expect(s.counters.at(-1)!.count).toBe(0);
    expect(s.counters.find((c) => c.id === 'subhanallah')!.count).toBe(1);
    expect(() => addCounter(s, '   ', 1)).toThrow();
    const id = s.activeId;
    s = removeCounter(s, id);
    expect(s.counters.some((c) => c.id === id)).toBe(false);
  });

  it('kalıcı depo: sayı yeniden açılışta korunur (ekran kapanma/uygulama kapanma senaryosu)', async () => {
    const storage = memoryStorage();
    const a = createPersistedStore({ key: 'ev571:t', version: 1, initial: { n: 0 }, storage });
    a.set({ n: 41 });
    await new Promise((r) => setTimeout(r, 10));
    const b = createPersistedStore({ key: 'ev571:t', version: 1, initial: { n: 0 }, storage });
    await b.hydrate();
    expect(b.get().n).toBe(41);
  });

  it('bozuk kayıt uygulamayı çökertmez, varsayılana döner', async () => {
    const storage = memoryStorage();
    await storage.setItem('ev571:t', '{bozuk json');
    const s = createPersistedStore({ key: 'ev571:t', version: 1, initial: { n: 7 }, storage });
    await s.hydrate();
    expect(s.get().n).toBe(7);
  });
});

describe('KVKK: yerel veri dışa aktarma ve silme', () => {
  it('yalnızca uygulamanın anahtarlarını dışa aktarır ve siler', async () => {
    const storage = memoryStorage();
    await storage.setItem('ev571:settings', '{"v":1}');
    await storage.setItem('ev571:dhikr', '{"v":1}');
    await storage.setItem('baska-uygulama', 'x');
    const exp = await exportAllLocalData(storage);
    expect(Object.keys(exp).sort()).toEqual(['ev571:dhikr', 'ev571:settings']);
    expect(await wipeAllLocalData(storage)).toBe(2);
    expect(storage.dump()).toEqual({ 'baska-uygulama': 'x' });
  });
});

describe('Erişilebilirlik: renk kontrastı (WCAG AA ≥ 4.5)', () => {
  for (const [name, p] of [['açık', light], ['koyu', dark]] as const) {
    it(`${name} tema metin çiftleri`, () => {
      expect(contrast(p.text, p.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.text, p.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.textMuted, p.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.textMuted, p.surfaceAlt)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.heroText, p.hero)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.heroMuted, p.hero)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.goldOnHero, p.hero)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.onPrimary, p.primary)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.gold, p.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.primary, p.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.danger, p.surface)).toBeGreaterThanOrEqual(4.5);
    });
  }
});
