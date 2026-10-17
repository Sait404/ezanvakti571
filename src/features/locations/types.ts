export type CoordinateQuality = 'geonames' | 'override' | 'province_center' | 'gps';

export type SettlementType = 'mahalle' | 'koy' | 'koy_mahallesi' | 'belde_mahallesi' | 'mezra_yayla' | 'diger';

export type Province = { code: string; name: string; lat: number; lon: number };

export type District = {
  /** Dizideki sıra — yerleşim listesiyle hizalıdır. */
  index: number;
  provinceCode: string;
  name: string;
  lat: number;
  lon: number;
  quality: CoordinateQuality;
  geonameId: string | null;
  settlementCount: number;
};

export type Settlement = {
  districtIndex: number;
  name: string;
  /** Bağlı köy/belde (ör. "Cihangazi Köyü"), yoksa boş. */
  parent: string;
  type: SettlementType;
  postalCodes: string[];
};

/**
 * Kullanıcının seçtiği konum. Kalıcı olarak saklanır; veri seti güncellense bile kimlik
 * il kodu + ilçe adı + yerleşim adı üzerinden yeniden çözümlenebilir.
 */
export type SelectedLocation = {
  id: string;
  country: 'TR';
  provinceCode: string;
  provinceName: string;
  districtName: string;
  settlementName?: string;
  settlementParent?: string;
  lat: number;
  lon: number;
  quality: CoordinateQuality;
  timeZone: string;
  /** Diyanet Awqat Salah şehir kimliği (backend eşlemesi yapıldıysa). */
  diyanetCityId?: number;
};

export const SETTLEMENT_TYPE_LABEL: Record<SettlementType, string> = {
  mahalle: 'Mahalle',
  koy: 'Köy',
  koy_mahallesi: 'Köy mahallesi',
  belde_mahallesi: 'Belde mahallesi',
  mezra_yayla: 'Mezra / yayla',
  diger: 'Yerleşim',
};
