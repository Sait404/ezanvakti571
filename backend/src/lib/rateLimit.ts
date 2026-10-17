/**
 * Bağımlılıksız, bellek içi kayan pencere hız sınırlayıcı (tek örnek dağıtımlar için).
 * Birden çok sunucu örneğinde Redis tabanlı bir sınırlayıcıyla değiştirilmelidir (docs/BACKEND.md).
 * Anahtar olarak IP'nin kendisi değil, tek yönlü özeti tutulur ve 1 dakika sonra unutulur.
 */
import { createHash } from 'node:crypto';

export class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(
    private readonly limit: number,
    private readonly windowMs = 60_000,
    private readonly now: () => number = Date.now,
  ) {}

  private key(id: string) {
    return createHash('sha256').update(id).digest('hex').slice(0, 24);
  }

  /** true → izin ver; false → sınır aşıldı */
  take(id: string): { allowed: boolean; remaining: number; retryAfterSec: number } {
    const k = this.key(id);
    const t = this.now();
    const arr = (this.hits.get(k) ?? []).filter((x) => t - x < this.windowMs);
    if (arr.length >= this.limit) {
      this.hits.set(k, arr);
      return { allowed: false, remaining: 0, retryAfterSec: Math.ceil((this.windowMs - (t - arr[0])) / 1000) };
    }
    arr.push(t);
    this.hits.set(k, arr);
    if (this.hits.size > 50_000) this.gc(t);
    return { allowed: true, remaining: this.limit - arr.length, retryAfterSec: 0 };
  }

  private gc(t: number) {
    for (const [k, v] of this.hits) if (!v.length || t - v[v.length - 1] >= this.windowMs) this.hits.delete(k);
  }
}
