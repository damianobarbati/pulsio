import EventService from '#api/event/EventService.ts';
import { ch } from '#dao/ch.ts';
import { cache } from '../dao/cache.ts';

const controller = new AbortController();
const stop = () => controller.abort();

process.once('SIGINT', stop);
process.once('SIGTERM', stop);

try {
  await EventService.startWorker({ signal: controller.signal });
} finally {
  await cache.quit();
  await ch.close();
}
