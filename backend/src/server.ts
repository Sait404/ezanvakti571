import { buildApp } from './app.js';
import { diyanetConfigured, loadConfig } from './config.js';
import { loadPlaceMap } from './diyanet/service.js';

const config = loadConfig();
const placeMap = await loadPlaceMap(config.DIYANET_PLACE_MAP);
const app = buildApp({ config, placeMap, logger: true });

if (!diyanetConfigured(config)) app.log.warn('Diyanet kimlik bilgileri tanımlı değil: /v1/prayer-times 503 döndürecek (istemci cihaz hesabına düşer).');
if (diyanetConfigured(config) && !Object.keys(placeMap.places).length) app.log.warn('Diyanet şehir eşlemesi boş: npm run sync:diyanet-places çalıştırın.');

await app.listen({ port: config.PORT, host: config.HOST });

for (const sig of ['SIGINT', 'SIGTERM'] as const) process.on(sig, () => void app.close().then(() => process.exit(0)));
