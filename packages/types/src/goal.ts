import z from 'zod';

export const goalInputSchema = z.object({
  site: z.uuid(),
  name: z.string().trim().min(1).max(100),
  kind: z.enum(['page', 'event', 'scroll']),
  target: z.string().trim().min(1).max(500),
  threshold: z.number().int().min(1).max(100).default(50),
  properties: z.record(z.string().min(1).max(100), z.string().max(200)).default({}),
});
export const goalSchema = goalInputSchema.omit({ site: true }).extend({ id: z.uuid(), site_id: z.uuid() });
export const goalUpdateSchema = goalInputSchema.extend({ id: z.uuid() });
export const goalIdentitySchema = z.object({ site: z.uuid(), id: z.uuid() });
export type GoalInput = z.infer<typeof goalInputSchema>;
export type Goal = z.infer<typeof goalSchema>;
