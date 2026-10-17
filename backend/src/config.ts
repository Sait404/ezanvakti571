import { z } from 'zod';

const Env = z.object({
  PORT: z.coerce.number().int().positive().default(8080),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGINS: z.string().default(''),
  DIYANET_BASE_URL: z.url().default('https://awqatsalah.diyanet.gov.tr'),
  DIYANET_EMAIL: z.string().default(''),
  DIYANET_PASSWORD: z.string().default(''),
  DIYANET_PLACE_MAP: z.string().default('./data/diyanet-place-map.json'),
  DATABASE_URL: z.string().default(''),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(60),
});

export type AppConfig = z.infer<typeof Env>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = Env.safeParse(env);
  if (!parsed.success) {
    // Değerleri değil yalnızca hatalı alan adlarını yazdır (sırlar loglanmaz).
    throw new Error(`Geçersiz ortam değişkenleri: ${parsed.error.issues.map((i) => i.path.join('.')).join(', ')}`);
  }
  return parsed.data;
}

export const diyanetConfigured = (c: AppConfig) => Boolean(c.DIYANET_EMAIL && c.DIYANET_PASSWORD);
