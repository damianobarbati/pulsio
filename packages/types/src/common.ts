import z from 'zod';

const AnySchema = z.any();
type Any = z.infer<typeof AnySchema>;

export const CommonSchemas = {
  any: AnySchema,
};

export namespace ICommon {
  export type anyValue = Any;
}
