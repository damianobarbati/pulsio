import z from 'nano-fw/zod.ts';

const ClientEventSchema = z.object({
  version: z.string().min(1),
  event_name: z.string().min(1),
  user_id: z.uuid(),
  url: z.url(),
  referrer: z.url().nullable(),
  width: z.number().int().positive(),
  scroll_depth: z.number().int().min(0).max(100).nullable(),
  engagement_ms: z.number().int().nonnegative().optional(),
  props: z.record(z.string(), z.union([z.string(), z.number()])),
  transaction_id: z.string().nullable(),
  revenue_amount: z.number().positive().nullable(),
  revenue_currency: z.string().min(1).max(10).nullable(),
  items: z.object({ id: z.string().min(1).max(64), name: z.string().min(1).max(64), price: z.number().positive(), quantity: z.number().positive() }).array(),
});
type ClientEvent = z.infer<typeof ClientEventSchema>;

const EventRowSchema = z.object({
  id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  timestamp: z.iso.datetime({ offset: true }),
  name: z.string(),
  user_id: z.uuid(),
  domain_id: z.uuid(),
  visitor_hash: z.uuid(),
  domain: z.string(),
  path: z.string(),
  query: z.string(),
  referrer_domain: z.string(),
  interactive: z.number().int().min(0).max(1),
  engagement_ms: z.number().int().nonnegative(),
  scroll_depth: z.number().int().min(0).max(100).nullable(),
  props: z.record(z.string(), z.string()),
  country_code: z.string().length(2),
  region_code: z.string(),
  city_id: z.number().int().nonnegative(),
  timezone: z.string(),
  screen_width: z.number().int().nonnegative(),
  device: z.string(),
  browser: z.string(),
  browser_version: z.string(),
  os: z.string(),
  os_version: z.string(),
  transaction_id: z.string(),
  revenue_amount: z.number().nullable(),
  revenue_currency: z.string().nullable(),
  usd_rate: z.number(),
  source: z.string(),
  channel: z.string(),
  utm_source: z.string(),
  utm_medium: z.string(),
  utm_campaign: z.string(),
  utm_content: z.string(),
  utm_term: z.string(),
});

export type EventRow = z.infer<typeof EventRowSchema>;
export type EventRowInsert = Omit<EventRow, 'created_at'>;

const EventSchema = EventRowSchema.clone();
export type Event = z.infer<typeof EventSchema>;

export const EventSchemas = {
  clientEvent: ClientEventSchema,
  row: EventRowSchema,
  event: EventSchema,
};

export namespace IEvent {
  export type clientEvent = ClientEvent;
  export type row = EventRow;
  export type event = Event;
  export type rowInsert = EventRowInsert;
}
