/**
 * Yerel bildirim planlama (expo-notifications).
 *
 * Gerçekçi sınırlar (kullanıcıya da gösterilir):
 *  - Android'de pil optimizasyonu / "Uyku" modu ve üretici kısıtları bildirimleri geciktirebilir.
 *  - Bu sürümde tam ezan sesi YOKTUR: kullanım hakkı doğrulanmış bir ezan kaydı eklenene kadar
 *    yalnızca sistem bildirim sesi kullanılır (bkz. docs/CONTENT_LICENSES.md).
 *  - iOS en fazla 64 bekleyen bildirim tutar; planlayıcı 60 ile sınırlar ve uygulama açıldıkça yeniler.
 */
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';
import { createPersistedStore } from '../../utils/persistedStore';
import { STORAGE_PREFIX } from '../../utils/storage';
import type { DayTimes } from '../prayer-times/types';
import { DEFAULT_NOTIFICATION_PREFS, planNotifications, type NotificationPrefs } from './planner';

export const notificationStore = createPersistedStore<NotificationPrefs>({
  key: `${STORAGE_PREFIX}notifications`,
  version: 1,
  initial: DEFAULT_NOTIFICATION_PREFS,
  validate: (p) => ({ ...DEFAULT_NOTIFICATION_PREFS, ...p, perPrayer: { ...DEFAULT_NOTIFICATION_PREFS.perPrayer, ...p.perPrayer } }),
});

const CHANNEL_SOUND = 'vakit-sesli';
const CHANNEL_SILENT = 'vakit-sessiz';

let handlerSet = false;
export function initNotificationHandler() {
  if (handlerSet) return;
  handlerSet = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

export async function ensureChannels(vibrate: boolean) {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_SOUND, {
    name: 'Namaz vakitleri (sesli)',
    importance: AndroidImportance.HIGH,
    vibrationPattern: vibrate ? [0, 250, 200, 250] : null,
    enableVibrate: vibrate,
  });
  await Notifications.setNotificationChannelAsync(CHANNEL_SILENT, {
    name: 'Namaz vakitleri (sessiz)',
    importance: AndroidImportance.DEFAULT,
    sound: null,
    enableVibrate: false,
  });
}

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export async function getPermission(): Promise<PermissionState> {
  const p = await Notifications.getPermissionsAsync();
  return p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied';
}

export async function requestPermission(): Promise<PermissionState> {
  const p = await Notifications.requestPermissionsAsync();
  return p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied';
}

/** Mevcut EzanVakti571 planını iptal eder ve yeni planı kurar. Planlanan sayısını döndürür. */
export async function reschedule(days: DayTimes[], locationTitle: string): Promise<number> {
  const prefs = notificationStore.get();
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(existing.filter((n) => n.identifier.startsWith('ev571:')).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  if (!prefs.enabled || (await getPermission()) !== 'granted') return 0;
  await ensureChannels(prefs.vibrate);
  const plan = planNotifications(days, prefs, new Date(), locationTitle);
  for (const n of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: n.id,
      content: { title: n.title, body: n.body, sound: n.sound ? 'default' : undefined, data: { prayer: n.prayer, kind: n.kind } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.fireAt, channelId: n.sound ? CHANNEL_SOUND : CHANNEL_SILENT },
    });
  }
  return plan.length;
}

export async function sendTestNotification() {
  const prefs = notificationStore.get();
  await ensureChannels(prefs.vibrate);
  await Notifications.scheduleNotificationAsync({
    identifier: 'ev571:test',
    content: { title: 'EzanVakti571 · Test bildirimi', body: 'Bildirimler bu cihazda çalışıyor.', sound: 'default' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: CHANNEL_SOUND },
  });
}
