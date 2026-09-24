import z from 'nano-fw/zod.ts';

export const DomainRowSchema = z
  .object({
    id: z.uuid(),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
    user_id: z.uuid().openapi({ example: '01a0af49-49a7-7c68-8b35-12a3e7804984' }),
    domain: z.string().min(1).max(255).openapi({ example: 'my-domain.com' }),
    detected_at: z.iso.datetime({ offset: true }).nullable(),
    reporting_currency: z.string().length(3),
  })
  .openapi('Domain');

export type DomainRow = z.infer<typeof DomainRowSchema>;

export const DomainSchema = DomainRowSchema.clone();
export type Domain = z.infer<typeof DomainSchema>;

const systemKeys = { id: true, created_at: true, updated_at: true } as const;

export const DomainRowInsertSchema = DomainRowSchema.omit(systemKeys).partial({ detected_at: true, reporting_currency: true });
export type DomainRowInsert = z.infer<typeof DomainRowInsertSchema>;

export const DomainRowUpdateSchema = DomainRowSchema.omit(systemKeys).partial();
export type DomainRowUpdate = z.infer<typeof DomainRowUpdateSchema>;

export const DomainListRequestSchema = z
  .object({
    search: z.string(),
    user_id: z.uuid(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative(),
    sort: z.array(z.tuple([z.enum(['id', 'created_at', 'updated_at', 'user_id', 'domain', 'detected_at', 'reporting_currency']), z.enum(['asc', 'desc'])])).max(2),
  })
  .partial();
export type DomainListRequest = z.infer<typeof DomainListRequestSchema>;

export const DomainListResponseSchema = z.array(DomainRowSchema);
export type DomainListResponse = z.infer<typeof DomainListResponseSchema>;
