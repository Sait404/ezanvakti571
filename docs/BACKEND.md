# Backend

Fastify 5 + TypeScript + zod. Node 22+.

## Uç noktalar
| Yöntem | Yol | Açıklama |
|---|---|---|
| GET | `/health` | Sağlık; `officialSource` Diyanet yapılandırılmış mı |
| GET | `/v1/prayer-times?provinceCode=47&district=Midyat&start=2026-10-17&days=1` | Diyanet vakitleri. 503 yapılandırılmamış, 404 `PLACE_NOT_MAPPED`, 502 Diyanet erişilemez, 400 doğrulama, 429 hız sınırı |

## Veritabanı
Şema: `database/migrations/001_init.sql`. Uygulamak için:
```bash
DATABASE_URL=postgres://... npm run migrate
```
Bu sürümde vakit servisi veritabanı gerektirmez; şema hesap, içerik ve Dinî Asistan aşamaları için hazırdır.

## Yedekleme ve kurtarma
```bash
pg_dump --format=custom --no-owner "$DATABASE_URL" > ezanvakti571-$(date +%F).dump   # günlük
pg_restore --clean --no-owner -d "$DATABASE_URL" ezanvakti571-YYYY-MM-DD.dump
```
- Günlük yedek, 30 gün saklama; yedekler şifreli depolamada.
- Ayda bir boş bir veritabanına geri yükleme tatbikatı yapın.
- Kullanıcı silme taleplerinden sonra eski yedeklerin saklama süresi sonunda silindiği belgelenmeli.

## Dağıtım
`npm run build && npm start` (ortam değişkenleri `.env.example`). HTTPS bir ters vekil arkasında sunulmalıdır; `trustProxy` açıktır.
