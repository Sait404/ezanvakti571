/**
 * İstemci yapılandırması. Burada YALNIZCA herkese açık değerler bulunur:
 * EXPO_PUBLIC_* değişkenleri uygulama paketine gömülür, bu yüzden hiçbir API anahtarı
 * veya parola buraya konmaz. Diyanet kimlik bilgileri ve yapay zekâ anahtarları
 * yalnızca backend/.env içinde tutulur.
 */
export const APP_NAME = 'EzanVakti571';

export const config = {
  /** Örn. https://api.ezanvakti571.example — boşsa uygulama tamamen cihaz üzerinde çalışır. */
  apiBaseUrl: (process.env.EXPO_PUBLIC_API_URL ?? '').trim() || undefined,
  supportEmail: (process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? '').trim() || undefined,
};
