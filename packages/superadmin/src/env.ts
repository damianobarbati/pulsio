import { z } from 'zod';

const envSchema = z.object({
  API_URL: z.url(),
  WEBSITE_URL: z.url(),
});
export type ENV = z.infer<typeof envSchema>;

const env = envSchema.strip().parse(process.env);
console.log(`${JSON.stringify(env, null, 2)}`);
