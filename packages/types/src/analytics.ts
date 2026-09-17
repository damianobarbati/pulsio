import z from 'zod';
import { goalSchema } from './goal.ts';

export const dimensionSchema = z.enum([
  'source',
  'channel',
  'referrer',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'page',
  'entry_page',
  'exit_page',
  'country',
  'region',
  'city',
  'browser',
  'browser_version',
  'os',
  'os_version',
  'device',
  'hostname',
  'property',
  'event',
]);
export const filterSchema = z.object({
  dimension: dimensionSchema,
  value: z.string().max(500),
  operator: z.enum(['is', 'is_not', 'contains']).default('is'),
  key: z.string().max(100).optional(),
});
export const analyticsInputSchema = z.object({
  site: z.string().optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  filters: z.string().max(4000).optional(),
  goal: z.uuid().optional(),
  reporting_currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .default('USD'),
});
export const breakdownInputSchema = analyticsInputSchema.extend({ dimension: dimensionSchema, key: z.string().max(100).optional() });
export const journeyInputSchema = analyticsInputSchema.extend({ start: z.string().max(500), direction: z.enum(['after', 'before']).default('after') });
export const summarySchema = z.object({
  visitors: z.number(),
  visits: z.number(),
  pageviews: z.number(),
  viewsPerVisit: z.number(),
  bounceRate: z.number(),
  visitDuration: z.number(),
  timeOnPage: z.number().nullable(),
  scrollDepth: z.number().nullable(),
});
export const revenueSchema = z.object({ currency: z.string(), totalRevenue: z.number(), averageRevenue: z.number(), orders: z.number() });
export const breakdownRowSchema = summarySchema.extend({ name: z.string(), value: z.number(), percentage: z.number(), exits: z.number(), exitRate: z.number() });
export const goalStatsSchema = goalSchema.extend({
  uniqueConversions: z.number(),
  totalConversions: z.number().nullable(),
  conversionRate: z.number(),
  revenue: revenueSchema.array(),
});
export const liveSchema = z.object({ activeVisitors: z.number(), pages: z.array(z.object({ name: z.string(), value: z.number() })) });
export const overviewSchema = z.object({
  activeVisitors: z.number(),
  from: z.string(),
  to: z.string(),
  summary: summarySchema,
  previous: summarySchema,
  timeline: summarySchema.extend({ label: z.string() }).array(),
  topPages: breakdownRowSchema.array(),
  sources: breakdownRowSchema.array(),
  goals: goalStatsSchema.array(),
  revenue: revenueSchema.array(),
});
export const journeySchema = z.array(z.object({ source: z.string(), target: z.string(), step: z.number(), visitors: z.number() }));
export type AnalyticsOverview = z.infer<typeof overviewSchema>;
export type AnalyticsInput = z.infer<typeof analyticsInputSchema>;
export type AnalyticsFilter = z.infer<typeof filterSchema>;
export type Dimension = z.infer<typeof dimensionSchema>;
export type BreakdownRow = z.infer<typeof breakdownRowSchema>;
export type GoalStats = z.infer<typeof goalStatsSchema>;
export type AnalyticsQuery = { siteId: string; from: string; to: string; filters: AnalyticsFilter[]; reportingCurrency: string; goal?: z.infer<typeof goalSchema> };
