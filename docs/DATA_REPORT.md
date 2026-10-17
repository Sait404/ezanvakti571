# Türkiye yerleşim verisi raporu

Oluşturulma: 2026-10-17T16:36:29.811Z

| Ölçü | Değer |
|---|---|
| İl | 81 |
| İlçe | 973 |
| Yerleşim kaydı (mahalle, köy, belde/köy mahallesi) | 73299 |
| GeoNames ile eşleşen ilçe koordinatı | 905 |
| İl merkezi koordinatı kullanılan ilçe (yaklaşık) | 68 |
| Tekrar olarak ayıklanan kayıt | 6 |

Yerleşim türleri: mahalle: 30742, belde_mahallesi: 1609, koy: 12733, koy_mahallesi: 28204, mezra_yayla: 11

## Bilinen eksikler (dürüst durum)

- Mahalle ve köy düzeyinde **ayrı koordinat yoktur**. Bu düzeylerde namaz vakti, bağlı olunan ilçenin merkez koordinatıyla hesaplanır.
- Aşağıdaki 68 ilçe için GeoNames'te ad eşleşmesi bulunamadı; bunlarda **il merkezi koordinatı** kullanılıyor ve uygulama bunu "yaklaşık konum" olarak gösteriyor. Güvenilir bir koordinat kaynağı eklendiğinde `scripts/build-locations.mjs` yeniden çalıştırılmalıdır.
- Veri, PTT listesindeki idari adlandırmayı izler (ör. bazı büyükşehir olmayan illerde merkez ilçe "Merkez" adıyla yer alır).

- Adana / Çukurova
- Ankara / Altındağ
- Ankara / Kahramankazan
- Ankara / Keçiören
- Ankara / Sincan
- Ankara / Yenimahalle
- Antalya / Gündoğmuş
- Aydın / Efeler
- Balıkesir / Altıeylül
- Balıkesir / Karesi
- Bingöl / Kiğı
- Elazığ / Alacakaya
- Erzincan / Üzümlü
- Erzurum / Aziziye
- Hakkari / Derecik
- Hatay / Defne
- Isparta / Sütçüler
- Mersin / Akdeniz
- Mersin / Toroslar
- Mersin / Yenişehir
- İstanbul / Avcılar
- İstanbul / Bakırköy
- İstanbul / Bayrampaşa
- İstanbul / Beşiktaş
- İstanbul / Beykoz
- İstanbul / Beyoğlu
- İstanbul / Eyüpsultan
- İstanbul / Fatih
- İstanbul / Gaziosmanpaşa
- İstanbul / Güngören
- İstanbul / Kadıköy
- İstanbul / Kağıthane
- İstanbul / Kartal
- İstanbul / Küçükçekmece
- İstanbul / Sarıyer
- İstanbul / Tuzla
- İzmir / Balçova
- İzmir / Beydağ
- İzmir / Çiğli
- İzmir / Güzelbahçe
- İzmir / Konak
- İzmir / Narlıdere
- Kırklareli / Demirköy
- Kocaeli / Başiskele
- Kocaeli / Dilovası
- Kocaeli / Kartepe
- Manisa / Şehzadeler
- Manisa / Yunusemre
- Kahramanmaraş / Ekinözü
- Mardin / Artuklu
- Muğla / Köyceğiz
- Muğla / Seydikemer
- Samsun / 19 Mayıs
- Samsun / Atakum
- Samsun / Canik
- Tekirdağ / Ergene
- Tekirdağ / Süleymanpaşa
- Trabzon / Ortahisar
- Şanlıurfa / Eyyübiye
- Şanlıurfa / Haliliye
- Van / İpekyolu
- Van / Tuşba
- Bayburt / Demirözü
- Batman / Gercüş
- Şırnak / Güçlükonak
- Ardahan / Çıldır
- Osmaniye / Bahçe
- Osmaniye / Düziçi

## Ayıklanan tekrarlar

- Bolu/Merkez: Merkez Mah (örencik Köyü)
- Bolu/Merkez: Yuva Merkez Mah (yuva Köyü)
- Çorum/İskilip: Çuhalar Mah (güneyaluç Köyü)
- Gümüşhane/Torul: Yayla Evleri Mah (küçükçit Köyü)
- Zonguldak/Çaycuma: Yeni Mah (ayvazlar Köyü)
- Karabük/Merkez: Merkez Mah (aşağı Kızılcaören Köyü)
