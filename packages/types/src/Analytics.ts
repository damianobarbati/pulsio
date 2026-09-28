import z from 'nano-fw/zod.ts';

export const AnalyticsKPIRequestSchema = z.object({
  domains: z.string().min(1).array(),
  from: z.iso.datetime({ offset: true }),
  to: z.iso.datetime({ offset: true }),
});
export type AnalyticsKPIRequest = z.infer<typeof AnalyticsKPIRequestSchema>;

export const MetricSchema = z.enum([
  'users_count',
  'sessions_count',
  'pageviews_count',
  'events_count',
  'pageviews_per_session_avg',
  'duration_per_session_avg',
  'engagement_rate',
  'conversion_rate',
  'conversions_count',
  'transactions_count',
  'revenue_sum',
  'revenue_per_transaction_avg',
]);
export type Metric = z.infer<typeof MetricSchema>;

export const AnalyticsKPIResponseSchema = z.object({
  users_count: z.number(),
  sessions_count: z.number(),
  pageviews_count: z.number(),
  events_count: z.number(),
  pageviews_per_session_avg: z.number(),
  duration_per_session_avg: z.number(),
  engagement_rate: z.number(),
  conversion_rate: z.number(),
  conversions_count: z.number(),
  transactions_count: z.number(),
  revenue_sum: z.number(),
  revenue_per_transaction_avg: z.number(),
});
export type AnalyticsKPIResponse = z.infer<typeof AnalyticsKPIResponseSchema>;

export const AnalyticsTimeseriesRequestSchema = AnalyticsKPIRequestSchema.extend({
  metric: MetricSchema,
  interval: z.enum(['hour', 'day', 'week', 'month']),
});
export type AnalyticsTimeseriesRequest = z.infer<typeof AnalyticsTimeseriesRequestSchema>;

export const AnalyticsTimeseriesResponseSchema = z.array(z.object({ timestamp: z.iso.datetime({ offset: true }), value: z.number() }));
export type AnalyticsTimeseriesResponse = z.infer<typeof AnalyticsTimeseriesResponseSchema>;

export const AnalyticsEventsRequestSchema = AnalyticsKPIRequestSchema;
export type AnalyticsEventsRequest = z.infer<typeof AnalyticsEventsRequestSchema>;

export const AnalyticsEventsResponseSchema = z.array(
  z.object({
    event_name: z.string(),
    count: z.number(),
    users: z.number(),
    conversion_rate: z.number(),
    percentage: z.number(),
  }),
);
export type AnalyticsEventsResponse = z.infer<typeof AnalyticsEventsResponseSchema>;

export const AnalyticsDemographicsDimensionSchema = z.enum(['browser', 'os', 'device', 'country', 'region', 'city']);
export type AnalyticsDemographicsDimension = z.infer<typeof AnalyticsDemographicsDimensionSchema>;

export const AnalyticsDemographicsRequestSchema = AnalyticsKPIRequestSchema.extend({
  dimension: AnalyticsDemographicsDimensionSchema,
});
export type AnalyticsDemographicsRequest = z.infer<typeof AnalyticsDemographicsRequestSchema>;

export const AnalyticsDemographicsResponseSchema = z.array(z.object({ name: z.string(), users: z.number(), percentage: z.number() }));
export type AnalyticsDemographicsResponse = z.infer<typeof AnalyticsDemographicsResponseSchema>;

export const AnalyticsAcquisitionDimensionSchema = z.enum(['source', 'channel', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']);
export type AnalyticsAcquisitionDimension = z.infer<typeof AnalyticsAcquisitionDimensionSchema>;

export const AnalyticsAcquisitionRequestSchema = AnalyticsKPIRequestSchema.extend({
  dimension: AnalyticsAcquisitionDimensionSchema,
});
export type AnalyticsAcquisitionRequest = z.infer<typeof AnalyticsAcquisitionRequestSchema>;

export const AnalyticsAcquisitionResponseSchema = AnalyticsDemographicsResponseSchema;
export type AnalyticsAcquisitionResponse = z.infer<typeof AnalyticsAcquisitionResponseSchema>;

export const AnalyticsLiveRequestSchema = z.object({
  domains: z.string().min(1).array(),
});
export type AnalyticsLiveRequest = z.infer<typeof AnalyticsLiveRequestSchema>;

export const AnalyticsLiveResponseSchema = z.number();
export type AnalyticsLiveResponse = z.infer<typeof AnalyticsLiveResponseSchema>;
