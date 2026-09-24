import { scheduleJob } from 'node-schedule';
import { ch } from '#dao/ch.ts';

const printClickhouseLatency = async () => {
  const query =
    'SELECT avg(toUnixTimestamp64Milli(created_at) - toUnixTimestamp64Milli(timestamp)) AS latency_ms FROM events WHERE created_at >= now() - INTERVAL 5 MINUTE AND timestamp >= now() - INTERVAL 5 MINUTE';

  const result = await ch.query({ query, format: 'JSONEachRow' });
  const [row] = await result.json<{ latency_ms: number | null }>();

  if (!row || row.latency_ms === null) {
    console.log('ClickHouse event latency: no events');
    return;
  }

  console.log(`ClickHouse event latency: ${Math.round(row.latency_ms)} ms`);
};

await printClickhouseLatency();
scheduleJob('*/5 * * * *', async () => {
  await printClickhouseLatency();
});
