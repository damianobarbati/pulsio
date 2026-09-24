import z from 'nano-fw/zod.ts';

export const AnalyticsOverviewRequestSchema = z.object({
  domains: z.string().min(1).array(),
  from: z.iso.datetime({ offset: true }),
  to: z.iso.datetime({ offset: true }),
});

export const AnalyticsLiveRequestSchema = z.object({
  domains: z.string().min(1).array(),
});
export const AnalyticsLiveResponseSchema = z.number();

const SummarySchema = z.object({
  visitors: z.number(),
  visits: z.number(),
  pageviews: z.number(),
  viewsPerVisit: z.number(),
  bounceRate: z.number(),
  visitDuration: z.number(),
  engagementRate: z.number(),
  events: z.number(),
  conversionRate: z.number(),
  timeOnPage: z.number(),
  scrollDepth: z.number(),
});

export const AnalyticsOverviewResponseSchema = z.object({
  from: z.iso.datetime({ offset: true }),
  to: z.iso.datetime({ offset: true }),
  summary: SummarySchema,
  previous: SummarySchema,
  changes: z.object({
    liveNow: z.number().nullable(),
    users: z.number().nullable(),
    views: z.number().nullable(),
    sessions: z.number().nullable(),
    sessionTime: z.number().nullable(),
    engagement: z.number().nullable(),
    events: z.number().nullable(),
    conversion: z.number().nullable(),
    revenue: z.number().nullable(),
  }),
  timeline: z.array(SummarySchema.extend({ label: z.iso.datetime({ offset: true }) })),
  revenue: z.array(z.object({ currency: z.string(), totalRevenue: z.number(), averageRevenue: z.number(), orders: z.number() })),
  goals: z.array(z.unknown()),
});
export type AnalyticsOverviewResponse = z.infer<typeof AnalyticsOverviewResponseSchema>;
