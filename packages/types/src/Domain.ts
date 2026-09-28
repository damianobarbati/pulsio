import z from 'nano-fw/zod.ts';

export const DomainShareRowSchema = z.object({
  id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  revoked_at: z.iso.datetime({ offset: true }).nullable(),
  domain_id: z.uuid(),
  label: z.string().min(1).max(100),
  show_revenue: z.boolean(),
  token_hash: z.string().min(1),
});
export type DomainShareRow = z.infer<typeof DomainShareRowSchema>;

export const DomainShareSchema = DomainShareRowSchema.omit({ token_hash: true });
export type DomainShare = z.infer<typeof DomainShareSchema>;

export const DomainRowSchema = z
  .object({
    id: z.uuid(),
    created_at: z.iso.datetime({ offset: true }),
    updated_at: z.iso.datetime({ offset: true }),
    user_id: z.uuid().openapi({ example: '01a0af49-49a7-7c68-8b35-12a3e7804984' }),
    domain: z.string().min(1).max(255).openapi({ example: 'my-domain.com' }),
    detected_at: z.iso.datetime({ offset: true }).nullable(),
    currency: z.string().length(3),
    events_count: z.number(),
    last_event_at: z.iso.datetime({ offset: true }).nullable(),
    report_frequency: z.enum(['daily', 'weekly', 'monthly']),
    report_recipients: z.array(z.email()),
    report_enabled: z.boolean(),
    report_last_sent_at: z.iso.datetime({ offset: true }).nullable(),
    email: z.email().openapi({ example: 'user@example.com' }),
  })
  .openapi('DomainRow');
export type DomainRow = z.infer<typeof DomainRowSchema>;

export const DomainSchema = DomainRowSchema.extend({ shares: z.array(DomainShareSchema) }).openapi('Domain');
export type Domain = z.infer<typeof DomainSchema>;

const systemKeys = { id: true, created_at: true, updated_at: true, email: true } as const;

export const DomainRowInsertSchema = DomainRowSchema.omit(systemKeys).partial({
  detected_at: true,
  currency: true,
  events_count: true,
  last_event_at: true,
  report_frequency: true,
  report_recipients: true,
  report_enabled: true,
  report_last_sent_at: true,
});
export type DomainRowInsert = z.infer<typeof DomainRowInsertSchema>;

export const DomainRowUpdateSchema = DomainRowSchema.omit(systemKeys).partial();
export type DomainRowUpdate = z.infer<typeof DomainRowUpdateSchema>;

export const DomainListRequestSchema = z
  .object({
    search: z.string(),
    user_id: z.uuid(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative(),
    sort: z.array(z.tuple([z.enum(['id', 'created_at', 'updated_at', 'user_id', 'domain', 'detected_at', 'currency']), z.enum(['asc', 'desc'])])).max(2),
  })
  .partial();
export type DomainListRequest = z.infer<typeof DomainListRequestSchema>;

export const DomainListResponseSchema = z.array(DomainSchema);
export type DomainListResponse = z.infer<typeof DomainListResponseSchema>;

const domainId = z.uuid().openapi({ param: { in: 'path', name: 'domainId' } });
const shareId = z.uuid().openapi({ param: { in: 'path', name: 'shareId' } });

export const DomainIdRequestSchema = z.object({ domainId });
export const DomainShareIdRequestSchema = z.object({ domainId, shareId });
export const DomainUpdateRequestSchema = DomainIdRequestSchema.extend(
  DomainRowSchema.pick({ currency: true, report_frequency: true, report_recipients: true, report_enabled: true }).partial().shape,
);
export const DomainShareCreateRequestSchema = DomainIdRequestSchema.extend(DomainShareRowSchema.pick({ label: true }).shape);
export const DomainShareResponseSchema = DomainShareSchema.omit({ domain_id: true }).extend({ url: z.url() });
export const DomainResetResponseSchema = z.object({ reset: z.literal(true) });
export const DomainDeleteResponseSchema = z.object({ deleted: z.literal(true) });

export type DomainIdRequest = z.infer<typeof DomainIdRequestSchema>;
export type DomainShareIdRequest = z.infer<typeof DomainShareIdRequestSchema>;
export type DomainUpdateRequest = z.infer<typeof DomainUpdateRequestSchema>;
export type DomainShareCreateRequest = z.infer<typeof DomainShareCreateRequestSchema>;
