import z from 'nano-fw/zod.ts';

const AnalyticsKPIRequestSchema = z.object({
  domains: z.string().min(1).array(),
  from: z.iso.datetime({ offset: true }),
  to: z.iso.datetime({ offset: true }),
});
type AnalyticsKPIRequest = z.infer<typeof AnalyticsKPIRequestSchema>;

const MetricSchema = z.enum([
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
type Metric = z.infer<typeof MetricSchema>;

const AnalyticsKPIResponseSchema = z.object({
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
type AnalyticsKPIResponse = z.infer<typeof AnalyticsKPIResponseSchema>;

const AnalyticsTimeseriesRequestSchema = AnalyticsKPIRequestSchema.extend({
  metric: MetricSchema,
  interval: z.enum(['hour', 'day', 'week', 'month']),
});
type AnalyticsTimeseriesRequest = z.infer<typeof AnalyticsTimeseriesRequestSchema>;

const AnalyticsTimeseriesResponseSchema = z.array(z.object({ timestamp: z.iso.datetime({ offset: true }), value: z.number() }));
type AnalyticsTimeseriesResponse = z.infer<typeof AnalyticsTimeseriesResponseSchema>;

const AnalyticsEventsRequestSchema = AnalyticsKPIRequestSchema;
type AnalyticsEventsRequest = z.infer<typeof AnalyticsEventsRequestSchema>;

const AnalyticsEventsResponseSchema = z
  .object({
    event_name: z.string(),
    count: z.number(),
    users: z.number(),
    conversion_rate: z.number(),
    percentage: z.number(),
  })
  .array();
type AnalyticsEventsResponse = z.infer<typeof AnalyticsEventsResponseSchema>;

const AnalyticsDemographicsDimensionSchema = z.enum(['browser', 'os', 'device', 'country', 'region', 'city']);
type AnalyticsDemographicsDimension = z.infer<typeof AnalyticsDemographicsDimensionSchema>;

const AnalyticsDemographicsRequestSchema = AnalyticsKPIRequestSchema.extend({
  dimension: AnalyticsDemographicsDimensionSchema,
});
type AnalyticsDemographicsRequest = z.infer<typeof AnalyticsDemographicsRequestSchema>;

const AnalyticsDemographicsResponseSchema = z.array(z.object({ name: z.string(), users: z.number(), percentage: z.number() }));
type AnalyticsDemographicsResponse = z.infer<typeof AnalyticsDemographicsResponseSchema>;

const AnalyticsAcquisitionDimensionSchema = z.enum(['source', 'channel', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']);
type AnalyticsAcquisitionDimension = z.infer<typeof AnalyticsAcquisitionDimensionSchema>;

const AnalyticsAcquisitionRequestSchema = AnalyticsKPIRequestSchema.extend({
  dimension: AnalyticsAcquisitionDimensionSchema,
});
type AnalyticsAcquisitionRequest = z.infer<typeof AnalyticsAcquisitionRequestSchema>;

const AnalyticsAcquisitionResponseSchema = AnalyticsDemographicsResponseSchema;
type AnalyticsAcquisitionResponse = z.infer<typeof AnalyticsAcquisitionResponseSchema>;

const AnalyticsLiveRequestSchema = z.object({
  domains: z.string().min(1).array(),
});
type AnalyticsLiveRequest = z.infer<typeof AnalyticsLiveRequestSchema>;

const AnalyticsLiveResponseSchema = z.number();
type AnalyticsLiveResponse = z.infer<typeof AnalyticsLiveResponseSchema>;

export const AnalyticsSchemas = {
  kpiRequest: AnalyticsKPIRequestSchema,
  metric: MetricSchema,
  kpiResponse: AnalyticsKPIResponseSchema,
  timeseriesRequest: AnalyticsTimeseriesRequestSchema,
  timeseriesResponse: AnalyticsTimeseriesResponseSchema,
  eventsRequest: AnalyticsEventsRequestSchema,
  eventsResponse: AnalyticsEventsResponseSchema,
  demographicsDimension: AnalyticsDemographicsDimensionSchema,
  demographicsRequest: AnalyticsDemographicsRequestSchema,
  demographicsResponse: AnalyticsDemographicsResponseSchema,
  acquisitionDimension: AnalyticsAcquisitionDimensionSchema,
  acquisitionRequest: AnalyticsAcquisitionRequestSchema,
  acquisitionResponse: AnalyticsAcquisitionResponseSchema,
  liveRequest: AnalyticsLiveRequestSchema,
  liveResponse: AnalyticsLiveResponseSchema,
};

export namespace IAnalytics {
  export type kpiRequest = AnalyticsKPIRequest;
  export type metric = Metric;
  export type kpiResponse = AnalyticsKPIResponse;
  export type timeseriesRequest = AnalyticsTimeseriesRequest;
  export type timeseriesResponse = AnalyticsTimeseriesResponse;
  export type eventsRequest = AnalyticsEventsRequest;
  export type eventsResponse = AnalyticsEventsResponse;
  export type demographicsDimension = AnalyticsDemographicsDimension;
  export type demographicsRequest = AnalyticsDemographicsRequest;
  export type demographicsResponse = AnalyticsDemographicsResponse;
  export type acquisitionDimension = AnalyticsAcquisitionDimension;
  export type acquisitionRequest = AnalyticsAcquisitionRequest;
  export type acquisitionResponse = AnalyticsAcquisitionResponse;
  export type liveRequest = AnalyticsLiveRequest;
  export type liveResponse = AnalyticsLiveResponse;
}
