import { AppText } from '../components/AppText';
import { Card, Screen } from '../components/ui';
import { config } from '../config';

/** Uygulamanın GERÇEK veri işleme davranışını anlatır. Tam metin: docs/PRIVACY_POLICY.md */
export default function PrivacyScreen() {
  return (
    <Screen edges={[]}>
      <Card>
        <AppText variant="heading">Özet</AppText>
        <AppText variant="caption" tone="muted">
          EzanVakti571 bu sürümde hesap oluşturmaz, reklam veya analiz aracı içermez ve kişisel verilerinizi bir sunucuya göndermez. Ayarlarınız, seçtiğiniz konum, favorileriniz ve tesbih kayıtlarınız yalnızca bu cihazda saklanır.
        </AppText>
      </Card>
      <Card>
        <AppText variant="heading">Konum</AppText>
        <AppText variant="caption" tone="muted">
          GPS yalnızca siz "Bulunduğum yeri kullan" dediğinizde bir kez okunur, yaklaşık 100 m hassasiyete yuvarlanır ve cihazda saklanır. Arka planda konum takibi yapılmaz. Konum izni vermeden uygulamayı listeden konum seçerek kullanabilirsiniz.
        </AppText>
      </Card>
      <Card>
        <AppText variant="heading">Sunucu iletişimi</AppText>
        <AppText variant="caption" tone="muted">
          {config.apiBaseUrl
            ? 'Resmî vakitleri almak için sunucuya yalnızca il kodu, ilçe adı ve tarih aralığı gönderilir (mahalle/köy veya GPS koordinatı gönderilmez). Sunucu bu isteklerde kişisel veri saklamaz; güvenlik için IP adresi kısa süreli hız sınırlamasında kullanılır.'
            : 'Bu yapılandırmada uygulama hiçbir sunucuya istek göndermez.'}
        </AppText>
      </Card>
      <Card>
        <AppText variant="heading">Haklarınız</AppText>
        <AppText variant="caption" tone="muted">
          Profil &gt; "Verilerimi dışa aktar" ile tüm verilerinizi alabilir, "Tüm verilerimi sil" ile kalıcı olarak silebilirsiniz. Uygulamayı kaldırmak da tüm verileri siler.{config.supportEmail ? ` İletişim: ${config.supportEmail}` : ''}
        </AppText>
      </Card>
    </Screen>
  );
}
