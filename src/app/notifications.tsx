import { useEffect, useState } from 'react';
import { Linking, Switch, View } from 'react-native';
import { AppText } from '../components/AppText';
import { Button, Card, Divider, Screen, Segmented } from '../components/ui';
import { config } from '../config';
import { locationLabel } from '../features/locations/data';
import { locationStore } from '../features/locations/store';
import type { AlertMode, NotificationPrefs } from '../features/notifications/planner';
import { getPermission, notificationStore, requestPermission, reschedule, sendTestNotification, type PermissionState } from '../features/notifications/scheduler';
import { getPrayerTimesRange } from '../features/prayer-times/service';
import { PRAYER_KEYS, PRAYER_LABEL, type PrayerKey } from '../features/prayer-times/types';
import { settingsStore } from '../features/settings/store';
import { useTheme } from '../theme/ThemeProvider';
import { spacing } from '../theme/tokens';
import { useStore } from '../utils/persistedStore';
import { defaultStorage } from '../utils/storage';
import { dateKeyOf } from '../utils/time';

const QUIET = [
  { value: 'none', label: 'Yok' },
  { value: '23:00-06:00', label: '23:00–06:00' },
  { value: '22:00-07:00', label: '22:00–07:00' },
];

async function applyPlan(): Promise<number> {
  const loc = locationStore.get().selected;
  if (!loc) return 0;
  const r = await getPrayerTimesRange(loc, dateKeyOf(new Date(), loc.timeZone), 7, { asr: settingsStore.get().asrMethod }, { apiBaseUrl: config.apiBaseUrl, fetchImpl: fetch, storage: defaultStorage });
  return reschedule(r.days, locationLabel(loc).title);
}

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const prefs = useStore(notificationStore, (s) => s);
  const [perm, setPerm] = useState<PermissionState | null>(null);
  const [planned, setPlanned] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void getPermission().then(setPerm).catch(() => setPerm('undetermined'));
  }, []);

  const update = async (patch: Partial<NotificationPrefs>) => {
    notificationStore.set(patch);
    try {
      setPlanned(await applyPlan());
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Bildirimler planlanamadı.');
    }
  };

  const setPrayer = (k: PrayerKey, patch: Partial<NotificationPrefs['perPrayer'][PrayerKey]>) =>
    update({ perPrayer: { ...prefs.perPrayer, [k]: { ...prefs.perPrayer[k], ...patch } } });

  const toggleAll = async (on: boolean) => {
    if (on) {
      const p = perm === 'granted' ? 'granted' : await requestPermission();
      setPerm(p);
      if (p !== 'granted') {
        setMsg('Bildirim izni verilmedi. İzin vermeden uygulamanın diğer bölümleri normal çalışır.');
        return;
      }
    }
    await update({ enabled: on });
  };

  return (
    <Screen edges={[]}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <AppText variant="heading">Vakit bildirimleri</AppText>
            <AppText variant="caption" tone="muted">
              İzin durumu: {perm === 'granted' ? 'verildi' : perm === 'denied' ? 'reddedildi' : perm ? 'henüz sorulmadı' : '…'}
              {planned != null ? ` · ${planned} bildirim planlandı` : ''}
            </AppText>
          </View>
          <Switch value={prefs.enabled} onValueChange={toggleAll} accessibilityLabel="Tüm vakit bildirimlerini aç veya kapat" trackColor={{ true: colors.primary, false: colors.border }} />
        </View>
        {perm === 'denied' ? <Button kind="secondary" compact label="Telefon ayarlarını aç" onPress={() => void Linking.openSettings()} /> : null}
        {msg ? <AppText variant="caption" tone="danger">{msg}</AppText> : null}
      </Card>

      {prefs.enabled ? (
        <>
          {PRAYER_KEYS.map((k) => (
            <Card key={k}>
              <AppText variant="heading">{PRAYER_LABEL[k]}</AppText>
              <Segmented<AlertMode>
                label={`${PRAYER_LABEL[k]} bildirim türü`}
                value={prefs.perPrayer[k].mode}
                onChange={(mode) => setPrayer(k, { mode })}
                options={[
                  { value: 'off', label: 'Kapalı' },
                  { value: 'silent', label: 'Sessiz' },
                  { value: 'sound', label: 'Sesli' },
                ]}
              />
              {prefs.perPrayer[k].mode !== 'off' ? (
                <>
                  <AppText variant="caption" tone="muted">Vakitten önce hatırlat</AppText>
                  <Segmented<number> label={`${PRAYER_LABEL[k]} öncesi hatırlatma`} value={prefs.perPrayer[k].beforeMin} onChange={(beforeMin) => setPrayer(k, { beforeMin })} options={[0, 10, 15, 30, 45].map((v) => ({ value: v, label: v ? `${v} dk` : 'Yok' }))} />
                  <AppText variant="caption" tone="muted">Vakitten sonra hatırlat</AppText>
                  <Segmented<number> label={`${PRAYER_LABEL[k]} sonrası hatırlatma`} value={prefs.perPrayer[k].afterMin} onChange={(afterMin) => setPrayer(k, { afterMin })} options={[0, 15, 30, 60].map((v) => ({ value: v, label: v ? `${v} dk` : 'Yok' }))} />
                </>
              ) : null}
            </Card>
          ))}

          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText>Titreşim</AppText>
              <Switch value={prefs.vibrate} onValueChange={(vibrate) => update({ vibrate })} accessibilityLabel="Titreşim" trackColor={{ true: colors.primary, false: colors.border }} />
            </View>
            <Divider />
            <AppText variant="caption" tone="muted">Sessiz saatler (bu aralıktaki bildirimler sessiz gelir)</AppText>
            <Segmented
              label="Sessiz saatler"
              value={prefs.quietStart && prefs.quietEnd ? `${prefs.quietStart}-${prefs.quietEnd}` : 'none'}
              onChange={(v) => {
                const [a, b] = v === 'none' ? [undefined, undefined] : v.split('-');
                void update({ quietStart: a, quietEnd: b });
              }}
              options={QUIET}
            />
            <Divider />
            <Button kind="secondary" icon="bell" label="Test bildirimi gönder (5 sn)" onPress={() => void sendTestNotification().catch((e) => setMsg(String(e)))} />
          </Card>
        </>
      ) : null}

      <Card tone="alt">
        <AppText variant="heading">Bilmeniz gerekenler</AppText>
        <AppText variant="caption" tone="muted">
          • Bu sürümde tam ezan sesi yoktur. Kullanım hakkı doğrulanmış bir ezan kaydı eklenene kadar telefonun standart bildirim sesi kullanılır.{'\n'}
          • Android'de pil tasarrufu, "Uyku" modu ve bazı üreticilerin arka plan kısıtları bildirimleri geciktirebilir veya engelleyebilir. Bildirimlerin her cihazda tam zamanında geleceği garanti edilemez.{'\n'}
          • iPhone'da en fazla 64 bekleyen bildirim tutulabildiği için uygulama yalnızca önümüzdeki günleri planlar; uygulamayı ara sıra açmanız planı yeniler.{'\n'}
          • Konum veya vakit yöntemi değiştiğinde eski bildirimler iptal edilip yeniden planlanır.
        </AppText>
      </Card>
    </Screen>
  );
}
