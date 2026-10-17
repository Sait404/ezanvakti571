# Diyanet resmî namaz vakitleri entegrasyonu

## Durum
Backend'de Diyanet İşleri Başkanlığı **Awqat Salah** API istemcisi hazırdır (`backend/src/diyanet/client.ts`). Uç noktalar ve kimlik doğrulama akışı açık kaynak `pydiyanet` istemcisinin kaynak kodundan doğrulanmıştır:

- `POST /Auth/Login` (e-posta + parola) → erişim (~30 dk) ve yenileme (~45 dk) tokenleri
- `GET /Auth/RefreshToken/{token}`
- `GET /api/PrayerTime/Daily/{cityId}`
- `GET /api/Place/Countries`, `/api/Place/States/{countryId}`, `/api/Place/Cities/{stateId}`

**Canlı denenmedi:** geliştirme ortamından Diyanet sunucusuna erişim yoktu. Yanıt alan adları (`fajr`, `sunrise`, `dhuhr`, `asr`, `maghrib`, `isha`, tarih alanları) sıkı şema doğrulamasından geçer; uyuşmazsa API 502 döner ve uygulama yanlış veriyi "resmî" diye göstermek yerine cihaz hesabına düşer.

## Sizin yapmanız gerekenler
1. Diyanet İşleri Başkanlığı'ndan Awqat Salah API erişimi için başvurun; kullanım koşullarını (istek sınırı, atıf, ticari kullanım) yazılı olarak alın.
2. `backend/.env` içine `DIYANET_EMAIL` ve `DIYANET_PASSWORD` girin (asla uygulamaya veya Git'e koymayın).
3. `cd backend && npm run sync:diyanet-places` — 973 ilçeyi Diyanet şehir kimlikleriyle eşler, eşleşmeyenleri listeler ve örnek bir günlük yanıtı canlı şema ile doğrular.
4. Eşleşmeyen ilçeleri elle kontrol edin; gerekirse `client.ts` alan adlarını canlı yanıta göre düzeltin ve `npm test` çalıştırın.
5. Uygulamada `EXPO_PUBLIC_API_URL` değerini backend adresine ayarlayın.

## Kurallar
- Sunucu, Diyanet'ten gelmeyen hiçbir veriyi `source: "diyanet"` ile döndürmez (testle güvence altında).
- Uygulama, kullanıcı asr-ı sânî seçerse resmî (asr-ı evvel) takvim yerine hesabı kullanır.
- Önbellek: şehir başına 12 saat; eşzamanlı istekler tek Diyanet çağrısında birleşir.
