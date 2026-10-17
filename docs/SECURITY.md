# Güvenlik ve KVKK kontrol listesi

## Uygulanan
- Sırlar yalnızca `backend/.env` içinde; `.env.example` hazır, `.env` Git dışı. İstemcide yalnızca `EXPO_PUBLIC_*` herkese açık değerler var.
- Girdi doğrulaması (zod), standart hata gövdesi `{error:{code,message,requestId}}`, 16 KB gövde sınırı.
- IP başına dakikalık hız sınırı (429 + Retry-After); IP düz metin saklanmaz.
- Loglarda `authorization`, `cookie` ve sorgu dizgileri yok; hatalarda parola sızmadığı testle doğrulandı.
- Güvenlik başlıkları (`nosniff`, `no-referrer`, `no-store`), izinli origin listesi dışında CORS yok.
- Veritabanı: kullanıcı tablolarında `FORCE ROW LEVEL SECURITY`; kullanıcı silinince tüm kişisel veriler `ON DELETE CASCADE` ile silinir (PGlite üzerinde test edildi).
- İçerik tabloları kaynak ve lisans kaydı olmadan veri kabul etmez.
- Android: arka plan konumu, mikrofon, depolama izinleri engelli; `allowBackup=false`.

## Yayın öncesi yapılacaklar
- HTTPS sonlandırma (ters vekil/Cloud yük dengeleyici) ve HSTS.
- Çok örnekli dağıtımda hız sınırını Redis'e taşımak.
- Hesap özelliği eklendiğinde: kimlik doğrulama, oturum yönetimi ve yetkilendirme testleri.
- `npm audit` bulgularının Expo SDK güncellemesiyle kapatılması (şu an yalnız derleme araçlarında).
- KVKK: VERBİS yükümlülüğü, aydınlatma metni, yurt dışına aktarım (sunucu konumu), saklama süreleri — hukukçu incelemesi. Bu liste hukuki uygunluk garantisi değildir.
