# EzanVakti571 — Durum raporu (17 Ekim 2026, sürüm 0.1.0)

Bu belge yalnızca **gerçekten çalıştırılmış** kontrolleri "geçti" olarak listeler.

## Çalıştırılan doğrulamalar

| Kontrol | Komut | Sonuç |
|---|---|---|
| TypeScript (uygulama + testler) | `npm run typecheck` | ✅ hatasız |
| ESLint (eslint-config-expo 58) | `npx expo lint` | ✅ 0 hata, 0 uyarı |
| Uygulama birim/entegrasyon testleri | `npm test` | ✅ 57/57 |
| Backend TypeScript | `cd backend && npm run typecheck` | ✅ hatasız |
| Backend testleri (API + gerçek Postgres motoru PGlite ile migrasyon/RLS) | `cd backend && npm test` | ✅ 20/20 |
| Backend derleme + canlı sunucu duman testi | `npm run build && npm start` | ✅ /health 200, yapılandırılmamış Diyanet → 503 |
| Android üretim JS paketi (Hermes bytecode) | `npm run export:android` | ✅ `dist/android/.../entry-*.hbc` (~7,8 MB) |
| Android yerel proje üretimi (CNG) | `npx expo prebuild --platform android` (geçici kopyada) | ✅ paket `com.ezanvakti571.app`, ad "EzanVakti571", izinler doğrulandı |
| Görsel QA (360×740 ve 412×915, açık/koyu) | `python3 scripts/screenshots.py` | ✅ yatay taşma yok (web önizlemesiyle) |
| expo-doctor | `npx expo-doctor` | 18/20 — kalan 2 kontrol Expo sunucusuna ağ erişimi gerektirdiği için çalışamadı |
| Bağımlılık taraması | `npm audit` | backend: 0 açık. Uygulama: 27 bulgu, tamamı derleme araç zincirinde (`@expo/config-plugins` vb.); uygulama paketine girmiyor, Expo SDK güncellemesiyle kapanmalı |

## Yapılamayanlar (dürüst durum)

- **APK/AAB derlemesi yapılmadı.** Bu çalışma ortamı Google Maven ve Gradle sunucularına erişemiyor ve Android SDK yok. Derleme EAS üzerinde yapılmalı: `npx eas-cli@latest build -p android --profile preview`.
- **Diyanet resmî verisi canlı denenmedi.** Ortamdan `awqatsalah.diyanet.gov.tr` erişilemedi ve API kimlik bilgisi yok. Entegrasyon sahte sunucuyla test edildi; canlı doğrulama adımları [DIYANET.md](DIYANET.md).
- **Gerçek cihaz testi yapılmadı** (bildirim zamanlaması, pusula sensörü, GPS). Ekran düzeni web önizlemesiyle kontrol edildi.

## Özellik durumu

| Modül | Durum |
|---|---|
| 5 sekmeli navigasyon, tema (açık/koyu/sistem), yazı ölçeği, erişilebilirlik etiketleri | ✅ |
| Türkiye konum sistemi: 81 il / 973 ilçe / 73.299 mahalle-köy-belde, Türkçe karakterli/karaktersiz arama, posta kodu, aynı adların il/ilçe ile ayrımı, favoriler, son seçilenler, GPS (isteğe bağlı) | ✅ — 68 ilçede koordinat il merkezinden yaklaşık ([DATA_REPORT.md](DATA_REPORT.md)) |
| Namaz vakitleri: günlük, geri sayım, haftalık/aylık (yıl boyunca gezinme), paylaşma, kaynak etiketi, çevrimdışı önbellek, gün değişimi | ✅ |
| Diyanet resmî vakit entegrasyonu | ⚠️ kod + testler hazır; kimlik bilgisi ve canlı doğrulama bekliyor |
| Bildirimler: vakit başına kapalı/sessiz/sesli, öncesi/sonrası hatırlatma, sessiz saatler, titreşim, test bildirimi, izin durumu | ✅ (tam ezan sesi yok — lisanslı kayıt gerekiyor) |
| Kıble pusulası (gerçek/manyetik kuzey, sensör yoksa uyarı, kalibrasyon rehberi) | ✅ — harita görünümü yok |
| Tesbih sayacı (hedef, özel zikir, titreşim, günlük/haftalık toplam, kalıcı) | ✅ — sesli sayım yok |
| Veri dışa aktarma / silme (KVKK), gizlilik ve kaynak ekranları | ✅ |
| Backend API, hız sınırı, standart hatalar, PostgreSQL şeması + RLS | ✅ |
| Kur'an, dua/zikir kütüphanesi, hadis, namaz öğrenme, hicri takvim, Ramazan, Dinî Asistan (RAG), camiler, çocuk modu, hesap/bulut | ❌ başlanmadı — uygulamada "Hazırlanıyor" olarak açıkça gösteriliyor |

## Sıradaki aşama önerisi

1. Diyanet erişimini alıp `sync:diyanet-places` ile eşlemeyi üretmek, canlı şemayı doğrulamak.
2. Kur'an metni: Tanzil Uthmani metni (atıf koşullu) + sağlama toplamı testleri; meal için yayıncı izni.
3. Dinî Asistan: lisanslı kaynak koleksiyonu + RAG + kapsam/uydurma/prompt-injection test seti.
