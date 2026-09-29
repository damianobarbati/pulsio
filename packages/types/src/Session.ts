import z from 'nano-fw/zod.ts';

const SessionRowSchema = z
  .object({
    id: z.uuid().openapi({ example: '01a0af49-49a7-7c68-8b35-12a3e7804984' }),
    user_id: z.uuid().openapi({ example: '01a0af49-49a7-7c68-8b35-12a3e7804984' }),
    token: z.string(),
    created_at: z.iso.datetime({ offset: true }),
    expires_at: z.iso.datetime({ offset: true }),
  })
  .openapi('Session');
type SessionRow = z.infer<typeof SessionRowSchema>;

const SessionSchema = SessionRowSchema.clone();
type Session = z.infer<typeof SessionRowSchema>;

export const SessionSchemas = {
  row: SessionRowSchema,
  session: SessionSchema,
};

export namespace ISession {
  export type row = SessionRow;
  export type session = Session;
}
