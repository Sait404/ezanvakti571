import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { setSettlementsSource } from '../src/features/locations/data';

setSettlementsSource(JSON.parse(readFileSync(join(import.meta.dirname, '../src/data/settlements.json'), 'utf8')));
