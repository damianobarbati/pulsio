import z from 'nano-fw/zod.ts';

const HeaderSchema = z.object({ name: z.string().trim().min(1).max(255), value: z.string().min(1).max(255) });
const GroupSchema = z.object({
  id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
  user_id: z.uuid(),
  label: z.string().min(1).max(100),
  public: z.boolean(),
  slug: z.string().min(1),
});
const MonitorSchema = z.object({
  id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
  group_id: z.uuid(),
  label: z.string().min(1).max(100),
  url: z.url(),
  auth_mode: z.enum(['none', 'headers']),
  headers: z.array(HeaderSchema).max(3),
  recipients: z.array(z.email()).min(1).max(10),
  enabled: z.boolean(),
  threshold_seconds: z.number().int().min(60).max(86400),
  state: z.enum(['up', 'down']),
  failed_at: z.iso.datetime({ offset: true }).nullable(),
  notified_at: z.iso.datetime({ offset: true }).nullable(),
});
const UsageSchema = z.object({ used: z.number().int().nonnegative(), limit: z.number().int().nonnegative() });
const GroupId = z.uuid().openapi({ param: { in: 'path', name: 'groupId' } });
const MonitorId = z.uuid().openapi({ param: { in: 'path', name: 'monitorId' } });
const GroupCreate = z.object({ label: z.string().trim().min(1).max(100) });
const MonitorCreate = z
  .object({
    groupId: GroupId,
    label: MonitorSchema.shape.label,
    url: MonitorSchema.shape.url,
    auth_mode: MonitorSchema.shape.auth_mode,
    headers: MonitorSchema.shape.headers,
    recipients: MonitorSchema.shape.recipients,
    threshold_seconds: MonitorSchema.shape.threshold_seconds,
    enabled: MonitorSchema.shape.enabled,
  })
  .superRefine((value, context) => {
    if (value.auth_mode === 'none' && value.headers.length) context.addIssue({ code: 'custom', message: 'Headers require header authentication.', path: ['headers'] });
  });

export const UptimeSchemas = {
  group: GroupSchema,
  monitor: MonitorSchema,
  groupCreate: GroupCreate,
  monitorCreate: MonitorCreate,
  groupId: z.object({ groupId: GroupId }),
  monitorId: z.object({ monitorId: MonitorId }),
  groupList: z.array(GroupSchema),
  monitorList: z.array(MonitorSchema),
  usage: UsageSchema,
  enabled: z.object({ monitorId: MonitorId, enabled: z.boolean() }),
  public: z.object({ groupId: GroupId, public: z.boolean() }),
  deleted: z.object({ deleted: z.literal(true) }),
};
export namespace IUptime {
  export type group = z.infer<typeof GroupSchema>;
  export type monitor = z.infer<typeof MonitorSchema>;
  export type groupCreate = z.infer<typeof GroupCreate>;
  export type monitorCreate = z.infer<typeof MonitorCreate>;
  export type usage = z.infer<typeof UsageSchema>;
}
