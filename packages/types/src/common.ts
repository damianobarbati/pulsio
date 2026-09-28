import z from 'zod';

export const AnySchema = z.any();
export type Any = z.infer<typeof AnySchema>;
