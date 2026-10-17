# EzanVakti571 Gizlilik Politikası (taslak — sürüm 0.1.0)

*Bu metin uygulamanın bu sürümdeki gerçek davranışını anlatır; yayın öncesi bir hukukçu tarafından KVKK açısından incelenmelidir.*

**Veri sorumlusu:** [Ad/unvan, adres, iletişim e-postası — doldurulacak]

## Toplanan ve işlenen veriler
- **Hesap yok.** Ad, e-posta, telefon toplanmaz.
- **Cihazda saklananlar:** seçtiğiniz konum, favori ve son konumlar, ayarlar, bildirim tercihleri, tesbih sayımları. Bunlar sunucuya gönderilmez; cihaz yedeklemesi kapalıdır.
- **Konum:** GPS yalnızca "Bulunduğum yeri kullan" dediğinizde bir kez okunur, ~100 m hassasiyete yuvarlanır ve cihazda saklanır. Arka plan konum izni istenmez.
- **Sunucu istekleri (yalnızca backend yapılandırılmışsa):** resmî vakitler için il kodu, ilçe adı ve tarih aralığı gönderilir. Mahalle/köy adı ve koordinat gönderilmez. IP adresi yalnızca kötüye kullanımı önleme amaçlı hız sınırında, tek yönlü özet olarak bellekte ~1 dakika tutulur; sorgu parametreleri loglanmaz.
- Reklam, analiz veya üçüncü taraf izleme SDK'sı yoktur.

## Haklarınız (KVKK m.11)
Profil > "Verilerimi dışa aktar" ve "Tüm verilerimi sil" seçenekleriyle verilerinize erişebilir ve silebilirsiniz. Uygulamayı kaldırmak tüm verileri siler.

## Çocuklar
Bu sürümde çocuk modu yoktur ve hiçbir kullanıcıdan kişisel veri toplanmaz.

## Değişiklikler
Hesap, bulut senkronizasyonu veya Dinî Asistan eklendiğinde bu politika güncellenecek ve bu özellikler yalnızca açık onayla etkinleşecektir.
