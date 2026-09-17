import { cache } from '../dao/cache.ts';
import { clickhouse } from '../dao/clickhouse.ts';
import { startWorker } from './ingest.ts';

const controller = new AbortController();
const stop = () => controller.abort();

process.once('SIGINT', stop);
process.once('SIGTERM', stop);

try {
  await startWorker({ signal: controller.signal });
} finally {
  await cache.quit();
  await clickhouse.close();
}
