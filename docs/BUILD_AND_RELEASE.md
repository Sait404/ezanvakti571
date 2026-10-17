# Derleme ve yayın

## Yerel doğrulama
```bash
npm run verify                    # typecheck + lint + test + Android JS paketi
cd backend && npm test && npm run build
```

## APK indirme bağlantısı (GitHub Actions — Expo hesabı gerekmez)
`.github/workflows/android-apk.yml` APK'yı GitHub'ın sunucularında derler:
1. Projeyi bir GitHub deposuna yükleyin (`main` dalı).
2. Depoda **Actions** sekmesi → "Android APK" → **Run workflow**. (~15–25 dk)
3. Bitince çalıştırma sayfasındaki **Artifacts › EzanVakti571-apk** düğmesiyle indirin.
4. Kalıcı bir indirme sayfası için etiket atın: `git tag v0.1.0 && git push --tags` → APK **Releases** sayfasına eklenir.

İmza: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` sırları tanımlı değilse APK test (debug) anahtarıyla imzalanır — telefona kurulur ama Play Store'a yüklenemez. Anahtar üretmek için:
`keytool -genkeypair -v -keystore release.keystore -alias ezanvakti571 -keyalg RSA -keysize 2048 -validity 10000` ve `base64 -w0 release.keystore`. Anahtarı kaybetmeyin; güncellemeler aynı anahtarla imzalanmalıdır.

## Android / iOS derlemesi (EAS)
```bash
npx eas-cli@latest login
npx eas-cli@latest init           # projeyi Expo hesabınıza bağlar (app.json'a projectId ekler)
npx eas-cli@latest build -p android --profile preview      # test için APK
npx eas-cli@latest build -p android --profile production   # Play Store için AAB
npx eas-cli@latest build -p ios --profile production       # Apple Developer hesabı gerekir
```
`eas.json` içindeki `production.env.EXPO_PUBLIC_API_URL` değerini gerçek backend adresinizle değiştirin.

## Yapılandırma özeti (app.json)
- Ad: **EzanVakti571** · Android paketi / iOS bundle: `com.ezanvakti571.app` · sürüm 0.1.0 (versionCode/buildNumber 1)
- Android izinleri: konum (yalnız ön plan), bildirim, titreşim, internet. Arka plan konumu, mikrofon, depolama ve üstte gösterme izinleri **engellendi**. `allowBackup: false` (ibadet kayıtları bulut yedeğine gitmez).
- iOS: `NSLocationWhenInUseUsageDescription` Türkçe açıklama; şifreleme beyanı `false`.
- İkon ve açılış ekranı: `assets/` (kaynak: `assets/brand/mark.svg`).

## Mağaza öncesi açık işler
- Gizlilik politikasının (docs/PRIVACY_POLICY.md) bir web adresinde yayımlanması ve destek e-postası (`EXPO_PUBLIC_SUPPORT_EMAIL`).
- Play "Data safety" ve App Store "Privacy Nutrition" formları: bu sürüm veri toplamıyor (yalnız cihazda saklama).
- Android 12+ tam zamanlı alarm izni istenmiyor; bildirimler birkaç dakika gecikebilir. `SCHEDULE_EXACT_ALARM` için Play politikası incelenmeli.
- Mağaza ekran görüntüleri gerçek cihazdan alınmalı.

## Mağaza açıklaması (taslak)
**EzanVakti571 — Namaz Vakitleri ve Kıble**
Türkiye'nin tüm il, ilçe, mahalle ve köyleri için namaz vakitleri; bir sonraki vakte geri sayım, haftalık ve aylık takvim, her vakit için ayrı ayarlanabilir bildirimler, kıble pusulası ve tesbih sayacı. Hesap gerekmez, reklam yoktur, verileriniz cihazınızda kalır. Vakitlerin kaynağı her ekranda açıkça gösterilir.
