import { setTimeout } from 'node:timers/promises';
import { type PageViewRowInsert, pageViewSchema } from 'types/event.ts';
import ENV from '#api/env.ts';
import { EventRepository } from './events/EventRepository.ts';
export const queueName = ENV.QUEUE_NAME;
export const processQueue = async (batchSize = ENV.BATCH_SIZE): Promise<number> => {
  if (!Number.isInteger(batchSize) || batchSize < 1) throw new Error('Invalid batch size');
  const { rows, token } = await EventRepository.claim({ batchSize });
  const events: PageViewRowInsert[] = [];
  const invalid: string[] = [];
  let acknowledge = false;
  try {
    for (const row of rows) {
      try {
        events.push(pageViewSchema.parse(JSON.parse(row)));
      } catch {
        invalid.push(row);
      }
    }
    await EventRepository.insert({ events });
    acknowledge = true;
    return rows.length;
  } finally {
    await EventRepository.finish({ token, invalid, acknowledge });
  }
};
export const startWorker = async ({ signal, batchSize = ENV.BATCH_SIZE }: { signal: AbortSignal; batchSize?: number }) => {
  while (!signal.aborted) {
    try {
      const processed = await processQueue(batchSize);
      if (processed) console.log(`Processed ${processed} events`);
      await setTimeout(100);
    } catch (error) {
      console.error('Event batch failed; retained for retry', error);
      await setTimeout(1000);
    }
  }
};
