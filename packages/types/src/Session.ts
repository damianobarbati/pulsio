import z from 'nano-fw/zod.ts';

export const SessionRowSchema = z
  .object({
    id: z.uuid().openapi({ example: '01a0af49-49a7-7c68-8b35-12a3e7804984' }),
    user_id: z.uuid().openapi({ example: '01a0af49-49a7-7c68-8b35-12a3e7804984' }),
    token: z.string(),
    created_at: z.iso.datetime({ offset: true }),
    expires_at: z.iso.datetime({ offset: true }),
  })
  .openapi('Session');
export type SessionRow = z.infer<typeof SessionRowSchema>;

export const SessionSchema = SessionRowSchema.clone();
export type Session = z.infer<typeof SessionRowSchema>;
