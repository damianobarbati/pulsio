import z from 'zod';

const httpUrl = z.url().refine((value) => URL.canParse(value) && ['http:', 'https:'].includes(new URL(value).protocol));
export const trackEventSchema = z.object({
  v: z.literal('1'),
  n: z.string().min(1).max(100),
  s: z.string().min(1).max(253),
  u: httpUrl,
  r: z.union([httpUrl, z.literal('')]),
  w: z.number().int().min(0).max(100000),
  l: z.string().max(100),
  t: z.string().max(100),
  pid: z.string().max(64).optional(),
  i: z.boolean().optional(),
  e: z.number().int().min(0).max(86400000).optional(),
  sd: z.number().int().min(0).max(100).optional(),
  p: z.record(z.string().max(100), z.union([z.string().max(200), z.number(), z.boolean()])).optional(),
  revenue: z.object({ amount: z.number().min(0).max(1e12), currency: z.string().regex(/^[A-Z]{3}$/) }).optional(),
});
export type TrackEvent = z.infer<typeof trackEventSchema>;
export const pageViewSchema = z.object({
  id: z.uuid(),
  timestamp: z.iso.datetime(),
  site_id: z.string().min(1),
  event_name: z.string().min(1),
  protocol_version: z.literal('1'),
  fingerprint: z.string(),
  url: z.string(),
  domain: z.string(),
  path: z.string(),
  query: z.string(),
  referrer: z.string().nullable(),
  screen_width: z.number().int().nonnegative(),
  language: z.string(),
  timezone: z.string(),
  page_id: z.string().optional(),
  interactive: z.number().int().min(0).max(1).optional(),
  engagement_ms: z.number().int().nonnegative().optional(),
  scroll_depth: z.number().nullable().optional(),
  props: z.record(z.string(), z.string()).optional(),
  revenue_amount: z.number().nullable().optional(),
  revenue_currency: z.string().optional(),
  browser: z.string().optional(),
  browser_version: z.string().optional(),
  os: z.string().optional(),
  os_version: z.string().optional(),
  device: z.string().optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  source: z.string().optional(),
  channel: z.string().optional(),
});
export type PageViewRowInsert = z.infer<typeof pageViewSchema>;
export type PageViewRow = PageViewRowInsert & { created_at: string };
export type PageViewFromClient = TrackEvent;
export type PageViewFromServer = Pick<PageViewRow, 'timestamp'>;
