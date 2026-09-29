import z from 'nano-fw/zod.ts';
import { AnalyticsSchemas } from '#types/Analytics.ts';

const ReportFrequencySchema = z.enum(['daily', 'weekly', 'monthly']);
type ReportFrequency = z.infer<typeof ReportFrequencySchema>;

const ReportSendResponseSchema = z.object({
  sent: z.literal(true),
  recipients: z.email().min(10).max(50).array(),
  frequency: ReportFrequencySchema,
  period_start: z.iso.datetime({ offset: true }),
  period_end: z.iso.datetime({ offset: true }),
  kpis: AnalyticsSchemas.kpiResponse,
});
type ReportSendResponse = z.infer<typeof ReportSendResponseSchema>;

export const ReportSchemas = {
  frequency: ReportFrequencySchema,
  sendResponse: ReportSendResponseSchema,
};

export namespace IReport {
  export type frequency = ReportFrequency;
  export type sendResponse = ReportSendResponse;
}
