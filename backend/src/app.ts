import Fastify, { type FastifyInstance } from 'fastify';
import { z } from 'zod';
import { diyanetConfigured, type AppConfig } from './config.js';
import { DiyanetClient } from './diyanet/client.js';
import { PrayerTimeService, type PlaceMap } from './diyanet/service.js';
import { ApiError, Errors } from './lib/errors.js';
import { RateLimiter } from './lib/rateLimit.js';

const PrayerQuery = z.object({
  provinceCode: z.string().regex(/^(0[1-9]|[1-7]\d|8[01])$/, 'provinceCode 01–81 olmalı'),
  district: z.string().trim().min(1).max(60),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  days: z.coerce.number().int().min(1).max(40).default(1),
});

export type BuildOptions = { config: AppConfig; placeMap: PlaceMap; diyanet?: DiyanetClient; logger?: boolean };

export function buildApp(opts: BuildOptions): FastifyInstance {
  const app = Fastify({
    logger: opts.logger
      ? {
          level: 'info',
          // Hassas başlıklar ve sorgu dizgileri loglanmaz.
          redact: ['req.headers.authorization', 'req.headers.cookie', 'req.query'],
          serializers: { req: (r) => ({ method: r.method, url: r.url.split('?')[0], id: r.id }) },
        }
      : false,
    bodyLimit: 16 * 1024,
    trustProxy: true,
  });

  const limiter = new RateLimiter(opts.config.RATE_LIMIT_PER_MINUTE);
  const service =
    diyanetConfigured(opts.config) || opts.diyanet
      ? new PrayerTimeService(
          opts.diyanet ??
            new DiyanetClient({ baseUrl: opts.config.DIYANET_BASE_URL, email: opts.config.DIYANET_EMAIL, password: opts.config.DIYANET_PASSWORD }),
          opts.placeMap,
        )
      : null;

  const origins = opts.config.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);

  app.addHook('onRequest', async (req, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('Cache-Control', 'no-store');
    const o = req.headers.origin;
    if (o && origins.includes(o)) reply.header('Access-Control-Allow-Origin', o).header('Vary', 'Origin');
    if (req.url === '/health') return;
    const r = limiter.take(req.ip);
    reply.header('X-RateLimit-Remaining', String(r.remaining));
    if (!r.allowed) {
      reply.header('Retry-After', String(r.retryAfterSec));
      throw Errors.rateLimited();
    }
  });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ApiError) return reply.status(err.status).send({ error: { code: err.code, message: err.message, requestId: req.id } });
    if (err instanceof z.ZodError) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '), requestId: req.id } });
    req.log?.error({ err: { message: (err as Error).message } }, 'beklenmeyen hata');
    return reply.status(500).send({ error: { code: 'INTERNAL', message: 'Beklenmeyen bir hata oluştu.', requestId: req.id } });
  });
  app.setNotFoundHandler((req, reply) => reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Uç nokta bulunamadı.', requestId: req.id } }));

  app.get('/health', async () => ({ ok: true, service: 'EzanVakti571 API', officialSource: Boolean(service) }));

  /**
   * Resmî Diyanet vakitleri. Yanıt yalnızca Diyanet'ten gelen veriyi içerir; hesaplanmış veri
   * asla "diyanet" etiketiyle dönmez. İstemci 503/404/502 durumlarında cihaz hesabına düşer.
   */
  app.get('/v1/prayer-times', async (req) => {
    const q = PrayerQuery.parse(req.query);
    if (!service) throw Errors.officialNotConfigured();
    const cityId = service.cityIdFor(q.provinceCode, q.district);
    if (!cityId) throw Errors.placeUnmapped();
    let result;
    try {
      result = await service.daysFor(cityId);
    } catch {
      throw Errors.upstream();
    }
    const days = q.start ? result.days.filter((d) => d.date >= q.start!).slice(0, q.days) : result.days.slice(0, q.days);
    return { source: 'diyanet' as const, cityId, fetchedAt: result.fetchedAt, days };
  });

  return app;
}
