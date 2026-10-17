/**
 * Kıble açısı: konumdan Kâbe'ye büyük daire başlangıç yönü (gerçek kuzeye göre, saat yönünde derece).
 * Kâbe koordinatı: 21.4225° K, 39.8262° D.
 */
export const KAABA = { lat: 21.4225, lon: 39.8262 } as const;

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export function qiblaBearing(lat: number, lon: number): number {
  const φ1 = toRad(lat);
  const φ2 = toRad(KAABA.lat);
  const Δλ = toRad(KAABA.lon - lon);
  const y = Math.sin(Δλ);
  const x = Math.cos(φ1) * Math.tan(φ2) - Math.sin(φ1) * Math.cos(Δλ);
  return normalizeDeg(toDeg(Math.atan2(y, x)));
}

export function normalizeDeg(d: number): number {
  return ((d % 360) + 360) % 360;
}

/** Cihazın baktığı yönden kıbleye dönmek için gereken açı (−180..180; pozitif = sağa dön). */
export function turnAngle(headingDeg: number, qiblaDeg: number): number {
  const d = normalizeDeg(qiblaDeg - headingDeg);
  return d > 180 ? d - 360 : d;
}

/**
 * Manyetometre x/y değerlerinden yaklaşık manyetik pusula yönü (cihaz yere paralel tutulurken).
 * Cihaz ekseni: x sağa, y üst kenara doğru. Üst kenar θ yönüne bakarken kuzey vektörü cihaz
 * çerçevesinde (−sin θ, cos θ) olur → θ = atan2(−x, y).
 */
export function headingFromMagnetometer(x: number, y: number): number {
  return normalizeDeg(toDeg(Math.atan2(-x, y)));
}

const DIRS = ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB'];
export function compassPoint(deg: number): string {
  return DIRS[Math.round(normalizeDeg(deg) / 45) % 8];
}

/** Kullanıcıya okunacak yönlendirme cümlesi. */
export function turnInstruction(turn: number): string {
  const a = Math.round(Math.abs(turn));
  if (a <= 3) return 'Kıble yönündesiniz.';
  return turn > 0 ? `${a}° sağa dönün.` : `${a}° sola dönün.`;
}
