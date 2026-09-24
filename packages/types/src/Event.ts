import z from 'nano-fw/zod.ts';

export const ClientEventSchema = z.object({
  version: z.string().min(1),
  event_name: z.string().min(1),
  user_id: z.uuid(),
  url: z.url(),
  referrer: z.url().nullable(),
  width: z.number().int().positive(),
  scroll_depth: z.number().int().min(0).max(100).nullable(),
  props: z.record(z.string(), z.union([z.string(), z.number()])),
  transaction_id: z.string().nullable(),
  revenue_amount: z.number().positive().nullable(),
  revenue_currency: z.string().min(1).max(10).nullable(),
  items: z.object({ id: z.string().min(1).max(64), name: z.string().min(1).max(64), price: z.number().positive(), quantity: z.number().positive() }).array(),
});
export type ClientEvent = z.infer<typeof ClientEventSchema>;

export const EventRowSchema = z.object({
  id: z.uuid(),
  site_id: z.uuid(),
  timestamp: z.iso.datetime({ offset: true }),
  created_at: z.iso.datetime({ offset: true }),
  event_name: z.string(),
  protocol_version: z.string(),
  fingerprint: z.string(),
  url: z.string().url(),
  domain: z.string(),
  path: z.string(),
  query: z.string(),
  referrer: z.string().nullable(),
  referrer_source: z.string(),
  screen_width: z.number().int().nonnegative(),
  language: z.string(),
  timezone: z.string(),
  transaction_id: z.string(),
  interactive: z.number().int().min(0).max(255).default(1),
  engagement_ms: z.number().int().nonnegative().default(0),
  scroll_depth: z.number().int().min(0).max(255).nullable(),
  props: z.record(z.string(), z.string()),
  revenue_amount: z.number().nullable(),
  revenue_currency: z.string(),
  browser: z.string(),
  browser_version: z.string(),
  os: z.string(),
  os_version: z.string(),
  device: z.string(),
  country_code: z.string().length(2),
  subdivision_code: z.string(),
  locality: z.string(),
  utm_source: z.string(),
  utm_medium: z.string(),
  utm_campaign: z.string(),
  utm_content: z.string(),
  utm_term: z.string(),
  source: z.string().nullable(),
  channel: z.string().nullable(),
});

export type EventRow = z.infer<typeof EventRowSchema>;
export type EventRowInsert = Omit<EventRow, 'created_at'>;

export const EventSchema = EventRowSchema.clone();
export type Event = z.infer<typeof EventSchema>;
