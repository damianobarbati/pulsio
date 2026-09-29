import z from 'nano-fw/zod.ts';

const DomainShareRowSchema = z.object({
  id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  revoked_at: z.iso.datetime({ offset: true }).nullable(),
  domain_id: z.uuid(),
  label: z.string().min(1).max(100),
  show_revenue: z.boolean(),
  token_hash: z.string().min(1),
});
type DomainShareRow = z.infer<typeof DomainShareRowSchema>;

const DomainShareSchema = DomainShareRowSchema.omit({ token_hash: true }).extend({ url: z.url() });
type DomainShare = z.infer<typeof DomainShareSchema>;

const DomainRowSchema = z
  .object({
    id: z.uuid(),
    created_at: z.iso.datetime({ offset: true }),
    updated_at: z.iso.datetime({ offset: true }),
    user_id: z.uuid().openapi({ example: '01a0af49-49a7-7c68-8b35-12a3e7804984' }),
    domain: z.string().toLowerCase().min(1).max(253).openapi({ example: 'my-domain.com' }),
    detected_at: z.iso.datetime({ offset: true }).nullable(),
    currency: z.string().min(1).max(3),
    events_count: z.number(),
    last_event_at: z.iso.datetime({ offset: true }).nullable(),
    report_frequency: z.enum(['daily', 'weekly', 'monthly']),
    report_recipients: z.array(z.email().min(10).max(50)),
    report_enabled: z.boolean(),
    report_last_sent_at: z.iso.datetime({ offset: true }).nullable(),
    email: z.email().min(10).max(50).openapi({ example: 'user@example.com' }),
  })
  .openapi('DomainRow');
type DomainRow = z.infer<typeof DomainRowSchema>;

const DomainSchema = DomainRowSchema.extend({ shares: z.array(DomainShareSchema) }).openapi('Domain');
type Domain = z.infer<typeof DomainSchema>;

const systemKeys = { id: true, created_at: true, updated_at: true, email: true } as const;

const DomainRowInsertSchema = DomainRowSchema.omit(systemKeys).partial({
  detected_at: true,
  currency: true,
  events_count: true,
  last_event_at: true,
  report_frequency: true,
  report_recipients: true,
  report_enabled: true,
  report_last_sent_at: true,
});
type DomainRowInsert = z.infer<typeof DomainRowInsertSchema>;

const DomainRowUpdateSchema = DomainRowSchema.omit(systemKeys).partial();
type DomainRowUpdate = z.infer<typeof DomainRowUpdateSchema>;

const DomainListRequestSchema = z
  .object({
    search: z.string(),
    user_id: z.uuid(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative(),
    sort: z.array(z.tuple([z.enum(['id', 'created_at', 'updated_at', 'user_id', 'domain', 'detected_at', 'currency']), z.enum(['asc', 'desc'])])).max(2),
  })
  .partial();
type DomainListRequest = z.infer<typeof DomainListRequestSchema>;

const DomainListResponseSchema = z.array(DomainSchema);
type DomainListResponse = z.infer<typeof DomainListResponseSchema>;

const domainId = z.uuid().openapi({ param: { in: 'path', name: 'domainId' } });
const shareId = z.uuid().openapi({ param: { in: 'path', name: 'shareId' } });

const DomainIdRequestSchema = z.object({ domainId });
const DomainShareIdRequestSchema = z.object({ domainId, shareId });
const DomainUpdateRequestSchema = DomainIdRequestSchema.extend(
  DomainRowSchema.pick({ currency: true, report_frequency: true, report_recipients: true, report_enabled: true }).partial().shape,
);
const DomainShareCreateRequestSchema = DomainIdRequestSchema.extend(DomainShareRowSchema.pick({ label: true }).shape);
const DomainShareResponseSchema = DomainShareSchema.omit({ domain_id: true }).extend({ url: z.url() });
const DomainResetResponseSchema = z.object({ reset: z.literal(true) });
const DomainDeleteResponseSchema = z.object({ deleted: z.literal(true) });

type DomainIdRequest = z.infer<typeof DomainIdRequestSchema>;
type DomainShareIdRequest = z.infer<typeof DomainShareIdRequestSchema>;
type DomainUpdateRequest = z.infer<typeof DomainUpdateRequestSchema>;
type DomainShareCreateRequest = z.infer<typeof DomainShareCreateRequestSchema>;

export const DomainSchemas = {
  shareRow: DomainShareRowSchema,
  share: DomainShareSchema,
  row: DomainRowSchema,
  domain: DomainSchema,
  rowInsert: DomainRowInsertSchema,
  rowUpdate: DomainRowUpdateSchema,
  listRequest: DomainListRequestSchema,
  listResponse: DomainListResponseSchema,
  idRequest: DomainIdRequestSchema,
  shareIdRequest: DomainShareIdRequestSchema,
  updateRequest: DomainUpdateRequestSchema,
  shareCreateRequest: DomainShareCreateRequestSchema,
  shareResponse: DomainShareResponseSchema,
  resetResponse: DomainResetResponseSchema,
  deleteResponse: DomainDeleteResponseSchema,
};

export namespace IDomain {
  export type shareRow = DomainShareRow;
  export type share = DomainShare;
  export type row = DomainRow;
  export type domain = Domain;
  export type rowInsert = DomainRowInsert;
  export type rowUpdate = DomainRowUpdate;
  export type listRequest = DomainListRequest;
  export type listResponse = DomainListResponse;
  export type idRequest = DomainIdRequest;
  export type shareIdRequest = DomainShareIdRequest;
  export type updateRequest = DomainUpdateRequest;
  export type shareCreateRequest = DomainShareCreateRequest;
  export type shareResponse = z.infer<typeof DomainShareResponseSchema>;
  export type resetResponse = z.infer<typeof DomainResetResponseSchema>;
  export type deleteResponse = z.infer<typeof DomainDeleteResponseSchema>;
}
