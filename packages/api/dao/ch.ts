import { createClient } from '@clickhouse/client';
import ENV from '#api/env.ts';
export const ch = createClient({ url: ENV.CH_URI, request_timeout: 30000, clickhouse_settings: { date_time_input_format: 'best_effort' } });
