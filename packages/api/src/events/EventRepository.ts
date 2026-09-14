import { randomUUID } from 'node:crypto';
import type { PageViewRowInsert } from 'types/event.ts';
import ENV from '#api/env.ts';
import { cache } from '../../dao/cache.ts';
import { clickhouse } from '../../dao/clickhouse.ts';

export const EventRepository = {
  async enqueue({ event }: { event: PageViewRowInsert }) {
    await cache.rpush(ENV.QUEUE_NAME, JSON.stringify(event));
    if (event.event_name === 'pv') {
      await cache.zadd(`active:${event.site_id}`, Date.now(), event.fingerprint);
      await cache.expire(`active:${event.site_id}`, 300);
      await cache.hset(`active-pages:${event.site_id}`, event.fingerprint, event.path);
      await cache.expire(`active-pages:${event.site_id}`, 300);
    }
  },
  async claim({ batchSize }: { batchSize: number }) {
    const token = randomUUID();
    const rows = (await cache.eval(
      `
      if not redis.call('SET', KEYS[3], ARGV[2], 'NX', 'PX', 60000) then return {} end
      if redis.call('LLEN', KEYS[2]) == 0 then
        local rows = redis.call('LRANGE', KEYS[1], 0, tonumber(ARGV[1]) - 1)
        for _, row in ipairs(rows) do redis.call('RPUSH', KEYS[2], row) end
        redis.call('LTRIM', KEYS[1], #rows, -1)
      end
      return redis.call('LRANGE', KEYS[2], 0, -1)
    `,
      3,
      ENV.QUEUE_NAME,
      `${ENV.QUEUE_NAME}:processing`,
      `${ENV.QUEUE_NAME}:lock`,
      batchSize,
      token,
    )) as string[];
    return { rows, token };
  },
  async finish({ token, invalid, acknowledge }: { token: string; invalid: string[]; acknowledge: boolean }) {
    await cache.eval(
      `
      if redis.call('GET', KEYS[2]) ~= ARGV[1] then return 0 end
      if ARGV[2] == '1' then
        for i = 3, #ARGV do redis.call('RPUSH', KEYS[3], ARGV[i]) end
        redis.call('DEL', KEYS[1])
      end
      redis.call('DEL', KEYS[2])
      return 1
    `,
      3,
      `${ENV.QUEUE_NAME}:processing`,
      `${ENV.QUEUE_NAME}:lock`,
      `${ENV.QUEUE_NAME}:failed`,
      token,
      acknowledge ? '1' : '0',
      ...invalid,
    );
  },
  async insert({ events }: { events: PageViewRowInsert[] }) {
    if (events.length) await clickhouse.insert({ table: 'events', values: events, format: 'JSONEachRow' });
  },
  async clear({ siteId }: { siteId: string }) {
    await clickhouse.command({
      query: 'ALTER TABLE events DELETE WHERE site_id = {siteId:String}',
      query_params: { siteId },
      clickhouse_settings: { mutations_sync: '1' },
    });
    await cache.del(`active:${siteId}`, `active-pages:${siteId}`);
    await cache.eval(
      `
      for _, key in ipairs(KEYS) do
        local events = redis.call('LRANGE', key, 0, -1)
        redis.call('DEL', key)
        for _, event in ipairs(events) do
          if cjson.decode(event).site_id ~= ARGV[1] then redis.call('RPUSH', key, event) end
        end
      end
      return 1
    `,
      2,
      ENV.QUEUE_NAME,
      `${ENV.QUEUE_NAME}:processing`,
      siteId,
    );
  },
};
