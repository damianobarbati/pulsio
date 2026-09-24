import z from 'nano-fw/zod.ts';

export const UserRowSchema = z
  .object({
    id: z.uuid().openapi({ example: '01a0af49-49a7-7c68-8b35-12a3e7804984' }),
    created_at: z.iso.datetime({ offset: true }),
    updated_at: z.iso.datetime({ offset: true }),
    email: z.email().openapi({ example: 'john.doe@example.com' }),
    password_hash: z.string().min(1),
    role: z.enum(['user', 'superadmin']),
    login_at: z.iso.datetime({ offset: true }).nullable(),
    password_changed_at: z.iso.datetime({ offset: true }),
    suspended_at: z.iso.datetime({ offset: true }).nullable(),
    email_verified_at: z.iso.datetime({ offset: true }).nullable(),
    email_verification_token_hash: z.string().nullable(),
    email_verification_expires_at: z.iso.datetime({ offset: true }).nullable(),
    trial_ends_at: z.iso.datetime({ offset: true }),
    name: z.string().nullable(),
    logo: z.url().nullable(),
    autodiscover_enabled: z.boolean(),
  })
  .openapi('User');
export type UserRow = z.infer<typeof UserRowSchema>;

const systemKeys = { id: true, created_at: true, updated_at: true } as const;

const nullableKeys = {
  role: true,
  name: true,
  logo: true,
  login_at: true,
  password_changed_at: true,
  suspended_at: true,
  email_verified_at: true,
  email_verification_token_hash: true,
  email_verification_expires_at: true,
  trial_ends_at: true,
  autodiscover_enabled: true,
} as const;

export const UserRowInsertSchema = UserRowSchema.omit(systemKeys).partial(nullableKeys);
export type UserRowInsert = z.infer<typeof UserRowInsertSchema>;

export const UserRowUpdateSchema = UserRowSchema.omit(systemKeys).partial();
export type UserRowUpdate = z.infer<typeof UserRowUpdateSchema>;

export const UserSchema = UserRowSchema.clone();
export type User = z.infer<typeof UserSchema>;

export const UserListSchema = z.array(UserSchema);
export type UserList = z.infer<typeof UserListSchema>;

export const UserCreateRequestSchema = UserRowSchema.pick({
  email: true,
}).required();
export type UserCreateRequest = z.infer<typeof UserCreateRequestSchema>;

export const UserGetRequestSchema = z.object({
  id: z.coerce.number().openapi({ param: { in: 'path', name: 'id' }, example: 1 }),
});
export type UserGetRequest = z.infer<typeof UserGetRequestSchema>;

export const UserListRequestSchema = z
  .object({
    search: z.string().trim().max(200),
    limit: z.number().int().min(1).max(100),
    offset: z.number().int().min(0),
    sort: z.array(z.tuple([z.enum(['id', 'email', 'created_at', 'login_at', 'trial_ends_at']), z.enum(['asc', 'desc'])])).max(2),
  })
  .partial();
export type UserListRequest = z.infer<typeof UserListRequestSchema>;

export const UserListResponseSchema = UserSchema.omit({
  password_hash: true,
  email_verification_token_hash: true,
})
  .strip()
  .array();
export type UserListResponse = z.infer<typeof UserListResponseSchema>;
