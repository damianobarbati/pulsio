import z from 'nano-fw/zod.ts';

const ContactRequestSchema = z.object({
  email: z.email().min(10).max(50),
  message: z.string().min(10).max(5000),
});

const ContactResponseSchema = z.object({ message: z.string() });

export const ContactSchemas = {
  request: ContactRequestSchema,
  response: ContactResponseSchema,
};

export namespace IContact {
  export type request = z.infer<typeof ContactRequestSchema>;
  export type response = z.infer<typeof ContactResponseSchema>;
}
