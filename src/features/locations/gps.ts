import * as Location from 'expo-location';
import { TURKEY_TZ } from '../../utils/time';
import { getProvince, isRoughlyInTurkey, locationFromDistrict, nearestDistrict } from './data';
import type { SelectedLocation } from './types';

export type GpsResult =
  | { ok: true; location: SelectedLocation; distanceKm: number }
  | { ok: false; reason: 'denied' | 'blocked' | 'services_off' | 'outside_turkey' | 'error'; message: string };

/**
 * Tek seferlik ön plan konumu. Arka planda konum takibi YAPILMAZ.
 * Koordinat ~100 m hassasiyete yuvarlanır ve yalnızca cihazda saklanır.
 */
export async function locateOnce(): Promise<GpsResult> {
  try {
    if (!(await Location.hasServicesEnabledAsync())) {
      return { ok: false, reason: 'services_off', message: 'Cihazınızda konum servisleri kapalı. Ayarlardan açabilir ya da listeden seçebilirsiniz.' };
    }
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) {
      return perm.canAskAgain
        ? { ok: false, reason: 'denied', message: 'Konum izni verilmedi. Sorun değil — il, ilçe veya köyünüzü listeden seçebilirsiniz.' }
        : { ok: false, reason: 'blocked', message: 'Konum izni kalıcı olarak kapalı. Telefon ayarlarından izin verebilir ya da listeden seçebilirsiniz.' };
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const lat = Math.round(pos.coords.latitude * 1000) / 1000;
    const lon = Math.round(pos.coords.longitude * 1000) / 1000;
    if (!isRoughlyInTurkey(lat, lon)) {
      return { ok: false, reason: 'outside_turkey', message: 'Bulunduğunuz konum Türkiye dışında görünüyor. Bu sürüm yalnızca Türkiye yerleşimlerini destekliyor.' };
    }
    const near = nearestDistrict(lat, lon);
    if (!near) return { ok: false, reason: 'error', message: 'En yakın ilçe bulunamadı.' };
    const base = locationFromDistrict(near.district);
    const p = getProvince(near.district.provinceCode)!;
    return {
      ok: true,
      distanceKm: near.distanceKm,
      location: { ...base, id: `${base.id}:gps`, lat, lon, quality: 'gps', timeZone: TURKEY_TZ, provinceName: p.name },
    };
  } catch (e) {
    return { ok: false, reason: 'error', message: e instanceof Error ? e.message : 'Konum alınamadı.' };
  }
}
