import z from 'zod';

export const registrationSchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((email) => email.toLowerCase()),
  password: z.string().min(12).max(128),
  domain: z.string().min(1).max(253),
  plan: z.enum(['start', 'grow', 'scale', 'expand']).default('start'),
});
export const loginSchema = registrationSchema.pick({ email: true, password: true });
export const siteSchema = registrationSchema.pick({ domain: true });
export const siteDataSchema = z.object({ site: z.uuid() });
export const deletionSchema = z.object({ deleted: z.boolean() });
export const superadminAccountUpdateSchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((email) => email.toLowerCase()),
});
export const verificationSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) });
export const verifiedSchema = z.object({ verified: z.boolean() });
export const accountSchema = z.object({ id: z.uuid(), email: z.email() });
export const siteSetupSchema = z.object({ id: z.uuid(), domain: z.string(), detected: z.boolean(), automaticallyDiscovered: z.boolean(), snippet: z.string(), adminUrl: z.url() });
export const accountDetailsSchema = z.object({ email: z.email(), sites: siteSetupSchema.array(), trial_ends_at: z.iso.datetime() });
export type Account = z.infer<typeof accountSchema>;
export type AccountRow = Account & {
  password_hash: string;
  suspended_at: Date | null;
  last_login_at: Date | null;
  created_at: Date;
  email_verified_at: Date | null;
  email_verification_token_hash: string | null;
  email_verification_expires_at: Date | null;
  trial_ends_at: Date;
};
export type Site = Pick<SiteSetup, 'id' | 'domain' | 'detected'>;
export type SiteRow = { id: string; user_id: string; domain: string; detected_at: string | null; automatically_discovered: boolean };
export type SiteSetup = z.infer<typeof siteSetupSchema>;
