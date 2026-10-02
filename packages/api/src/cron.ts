import { scheduleJob } from 'node-schedule';
import DomainService from '#api/domain/DomainService.ts';
import ReportService from '#api/report/ReportService.ts';
import { ch } from '#dao/ch.ts';

const printClickhouseLatency = async () => {
  const query = 'SELECT avg(toUnixTimestamp64Milli(created_at) - toUnixTimestamp64Milli(timestamp)) AS latency_ms FROM events WHERE created_at >= now() - INTERVAL 5 MINUTE';
  const result = await ch.query({ query, format: 'JSONEachRow' });
  const [row] = await result.json<{ latency_ms: number }>();
  if (!row) return;
  console.log(`ClickHouse event latency: ${Math.round(row.latency_ms)} ms`);
};

scheduleJob('*/1 * * * *', printClickhouseLatency);
scheduleJob('*/1 * * * *', DomainService.syncEventCounts);
scheduleJob('*/1 * * * *', async () => {
  try {
    const sent = await ReportService.sendScheduled();
    if (sent) console.log(`Reports sent: ${sent}`);
  } catch (error) {
    console.error('Scheduled report sending failed:', error);
  }
});
