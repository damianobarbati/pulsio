import z from 'nano-fw/zod.ts';
import { AnalyticsKPIResponseSchema } from './Analytics.ts';

export const ReportFrequencySchema = z.enum(['daily', 'weekly', 'monthly']);
export type ReportFrequency = z.infer<typeof ReportFrequencySchema>;

export const ReportSendResponseSchema = z.object({
  sent: z.literal(true),
  recipients: z.email().array(),
  frequency: ReportFrequencySchema,
  period_start: z.iso.datetime({ offset: true }),
  period_end: z.iso.datetime({ offset: true }),
  kpis: AnalyticsKPIResponseSchema,
});
export type ReportSendResponse = z.infer<typeof ReportSendResponseSchema>;
