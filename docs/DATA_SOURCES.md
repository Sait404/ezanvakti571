# Veri kaynakları ve lisanslar

| Veri | Kaynak | Lisans / koşul | Uygulamada atıf |
|---|---|---|---|
| İl, ilçe, mahalle, köy, belde adları ve posta kodları | PTT A.Ş. posta kodu listesi (`pk_list.zip`), npm `turkey-neighbourhoods@4.0.3` üzerinden | Paket kodu MIT. Ad listesi PTT'nin kamuya açık yayını; **yayın öncesi PTT kullanım koşulları hukuken teyit edilmeli** | Kaynaklar ekranı |
| İl/ilçe merkezi koordinatları | GeoNames `cities1000`, npm `all-the-cities@3.1.0` üzerinden | **CC BY 4.0** — atıf zorunlu | Kaynaklar ekranı (GeoNames bağlantısı) |
| Astronomik vakit hesabı | adhan-js 4.4.6 | MIT | Kaynaklar ekranı, her vakit kartında "Hesaplanan vakit" etiketi |
| Resmî vakitler | Diyanet İşleri Başkanlığı Awqat Salah | Diyanet erişim izni gerekli | "Diyanet verisi" etiketi |

## Güncelleme

```bash
npm i -D turkey-neighbourhoods@latest all-the-cities@latest
npm run data:locations      # bütünlük kontrolü başarısızsa çıktı yazılmaz
npm test
```

Betik şu kontrolleri yapar ve herhangi biri başarısızsa çıkış kodu 1 ile durur: 81 il, il kodlarının tamlığı, koordinatsız ilçe olmaması, koordinatların Türkiye sınırında olması, ilçe tekrarı olmaması, yerleşimsiz ilçe olmaması. İlçe içi tekrarlar ayıklanır ve [DATA_REPORT.md](DATA_REPORT.md)'ye yazılır.

## Eksik koordinatların düzeltilmesi

`data/location-overrides.json` dosyasına yalnızca **doğrulanmış ve lisansı uygun** kaynaktan alınmış ilçe merkezi koordinatları eklenir (`plate`, `district`, `lat`, `lon`, `source`, `license` zorunlu). Hiçbir köy/mahalle tahminle üretilmez.

## Yurt dışı konumlar

`SelectedLocation` her kayıtta `country` ve IANA `timeZone` taşır; vakit hesabı ve gösterim saat dilimine göre yapılır (yaz saati testleri `tests/prayer-times.test.ts`). Yeni ülke eklemek için veri katmanına ülke kaynağı eklenmesi yeterlidir.
