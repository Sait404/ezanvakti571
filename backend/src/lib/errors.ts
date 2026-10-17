/** Standart hata gövdesi: { error: { code, message, requestId } } */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const Errors = {
  validation: (msg: string) => new ApiError(400, 'VALIDATION_ERROR', msg),
  notFound: (msg = 'Kaynak bulunamadı.') => new ApiError(404, 'NOT_FOUND', msg),
  rateLimited: () => new ApiError(429, 'RATE_LIMITED', 'Çok fazla istek. Lütfen biraz sonra tekrar deneyin.'),
  officialNotConfigured: () => new ApiError(503, 'OFFICIAL_SOURCE_NOT_CONFIGURED', 'Diyanet veri erişimi bu sunucuda yapılandırılmamış.'),
  upstream: (msg = 'Resmî vakit kaynağına şu anda ulaşılamıyor.') => new ApiError(502, 'UPSTREAM_UNAVAILABLE', msg),
  placeUnmapped: () => new ApiError(404, 'PLACE_NOT_MAPPED', 'Bu ilçe için Diyanet şehir eşlemesi bulunamadı.'),
};
