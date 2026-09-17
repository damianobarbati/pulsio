import { setTimeout } from 'node:timers/promises';
import { describe, expect, it, vi } from 'vitest';
import { createPageviewRow } from '#api/helpers.ts';
import { cache } from '../dao/cache.ts';
import { clickhouse } from '../dao/clickhouse.ts';
import { EventRepository } from './events/EventRepository.ts';
import { processQueue, queueName, startWorker } from './ingest.ts';

const countEvents = async () => {
  const result = await clickhouse.query({ query: 'SELECT count() AS count FROM events', format: 'JSONEachRow' });
  const [row] = await result.json<{ count: string }>();
  return Number(row.count);
};
describe('Redis to ClickHouse', () => {
  it('flushes a partial batch and stops on abort', async () => {
    await cache.rpush(queueName, JSON.stringify(createPageviewRow()));
    const controller = new AbortController();
    const worker = startWorker({ signal: controller.signal });
    let count = 0;
    try {
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline && count === 0) {
        count = await countEvents();
        await setTimeout(20);
      }
      expect(count).toEqual(1);
    } finally {
      controller.abort();
      await worker;
    }
  });
  it('inserts a bounded batch and leaves the remainder queued', async () => {
    const events = Array.from({ length: 5 }, createPageviewRow);
    await cache.rpush(queueName, ...events.map((event) => JSON.stringify(event)));
    expect(await processQueue(3)).toEqual(3);
    expect(await countEvents()).toEqual(3);
    expect(await cache.llen(queueName)).toEqual(2);
  });
  it('retains the batch after an insert fails, then retries without double counting', async () => {
    const event = createPageviewRow();
    await cache.rpush(queueName, JSON.stringify(event));
    const insert = vi.spyOn(EventRepository, 'insert').mockRejectedValueOnce(new Error('ClickHouse unavailable'));
    await expect(processQueue()).rejects.toThrow('ClickHouse unavailable');
    expect(await cache.llen(`${queueName}:processing`)).toEqual(1);
    insert.mockRestore();
    await processQueue();
    await cache.rpush(queueName, JSON.stringify(event));
    await processQueue();
    expect(await countEvents()).toEqual(2);
    expect(await cache.llen(`${queueName}:processing`)).toEqual(0);
  });
  it('quarantines invalid records and continues inserting valid records', async () => {
    await cache.rpush(queueName, '{broken', JSON.stringify({ u: 'legacy' }), JSON.stringify(createPageviewRow()));
    await processQueue();
    expect(await cache.llen(`${queueName}:failed`)).toEqual(2);
    expect(await countEvents()).toEqual(1);
  });
  it('allows only one worker to own a batch', async () => {
    await cache.rpush(queueName, JSON.stringify(createPageviewRow()));
    const claim = await EventRepository.claim({ batchSize: 10 });
    expect(await processQueue()).toEqual(0);
    expect(await cache.get(`${queueName}:lock`)).toEqual(claim.token);
    await EventRepository.finish({ token: claim.token, invalid: [], acknowledge: false });
    await processQueue();
    expect(await countEvents()).toEqual(1);
  });
  it('recovers a batch after a crashed worker lease expires', async () => {
    await cache.rpush(queueName, JSON.stringify(createPageviewRow()));
    const old = await EventRepository.claim({ batchSize: 1 });
    await cache.pexpire(`${queueName}:lock`, 0);
    const current = await EventRepository.claim({ batchSize: 1 });
    await EventRepository.finish({ token: old.token, invalid: [], acknowledge: true });
    expect(await cache.llen(`${queueName}:processing`)).toEqual(1);
    await EventRepository.finish({ token: current.token, invalid: [], acknowledge: false });
    await processQueue();
    expect(await countEvents()).toEqual(1);
  });
});
