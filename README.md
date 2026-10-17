# EzanVakti571

Türkiye'nin 81 ili, 973 ilçesi ve 73 bin+ mahalle/köy/belde kaydı için namaz vakitleri, kıble pusulası ve tesbih sayacı sunan React Native (Expo) uygulaması ile Node.js/TypeScript backend.

> **Durum: Aşama 1 (geliştirme sürümü 0.1.0).** Neyin bittiği, neyin bitmediği ve neden: [docs/STATUS.md](docs/STATUS.md). Henüz mağazaya gönderilmeye hazır değildir.

## Hızlı başlangıç

```bash
npm install
npm run verify          # tür kontrolü + lint + testler + Android üretim JS paketi
npx expo start          # geliştirme sunucusu (Expo Go veya geliştirme derlemesi)
```

Backend:

```bash
cd backend
npm install
cp .env.example .env    # Diyanet kimlik bilgilerini buraya girin (isteğe bağlı)
npm test && npm run build && npm start
```

Uygulamayı backend'e bağlamak için kökte `.env` içine `EXPO_PUBLIC_API_URL=https://...` yazın. Bu değişken boşsa uygulama tamamen cihaz üzerinde çalışır ve vakitleri **"Hesaplanan vakit"** etiketiyle gösterir.

## Proje yapısı

```
src/app/                Expo Router ekranları (5 sekme + konum, takvim, tesbih, kıble, bildirim, kaynaklar, gizlilik)
src/features/           locations · prayer-times · notifications · qibla · dhikr · settings
src/components, theme/  tasarım sistemi (zümrüt/kırık beyaz/altın, açık-koyu tema, yazı ölçeği)
src/data/               üretilmiş Türkiye yerleşim verisi (scripts/build-locations.mjs)
tests/                  uygulama mantığı testleri (Vitest)
backend/                Fastify API, Diyanet Awqat Salah istemcisi, migrasyon çalıştırıcı, testler
database/migrations/    PostgreSQL şeması (RLS, KVKK silme zinciri, kaynak/lisans ilişkileri)
docs/                   durum, veri kaynakları, Diyanet erişimi, gizlilik, güvenlik, mağaza
```

## Belgeler

- [STATUS.md](docs/STATUS.md) — özellik durumu ve test/derleme sonuçları
- [DATA_SOURCES.md](docs/DATA_SOURCES.md), [DATA_REPORT.md](docs/DATA_REPORT.md) — yerleşim verisi, lisanslar, eksikler
- [DIYANET.md](docs/DIYANET.md) — resmî vakit entegrasyonu ve gereken adımlar
- [BUILD_AND_RELEASE.md](docs/BUILD_AND_RELEASE.md) — EAS derleme, imzalama, mağaza
- [PRIVACY_POLICY.md](docs/PRIVACY_POLICY.md), [SECURITY.md](docs/SECURITY.md) — KVKK ve güvenlik
- [BACKEND.md](docs/BACKEND.md) — API, veritabanı, yedekleme/kurtarma
