import z from 'nano-fw/zod.ts';

const UserRowSchema = z
  .object({
    id: z.uuid().openapi({ example: '01a0af49-49a7-7c68-8b35-12a3e7804984' }),
    created_at: z.iso.datetime({ offset: true }),
    updated_at: z.iso.datetime({ offset: true }),
    deleted_at: z.iso.datetime({ offset: true }).nullable().optional(),
    email: z.email().min(10).max(50).toLowerCase().openapi({ example: 'john.doe@example.com' }),
    password_hash: z.string().min(1).max(100),
    role: z.enum(['user', 'superadmin']),
    login_at: z.iso.datetime({ offset: true }).nullable(),
    password_changed_at: z.iso.datetime({ offset: true }),
    suspended_at: z.iso.datetime({ offset: true }).nullable(),
    email_verified_at: z.iso.datetime({ offset: true }).nullable(),
    email_verification_token_hash: z.string().nullable(),
    email_verification_expires_at: z.iso.datetime({ offset: true }).nullable(),
    trial_ends_at: z.iso.datetime({ offset: true }),
    name: z.string().min(1).max(80).nullable(),
    primary_color: z.string().max(10).nullable(),
    autodiscover_enabled: z.boolean(),
    stripe_customer_id: z.string().min(1).max(255).nullable().optional(),
  })
  .openapi('User');
type UserRow = z.infer<typeof UserRowSchema>;

const systemKeys = { id: true, created_at: true, updated_at: true } as const;

const nullableKeys = {
  role: true,
  name: true,
  primary_color: true,
  login_at: true,
  password_changed_at: true,
  suspended_at: true,
  email_verified_at: true,
  email_verification_token_hash: true,
  email_verification_expires_at: true,
  trial_ends_at: true,
  stripe_customer_id: true,
  deleted_at: true,
  autodiscover_enabled: true,
} as const;

const UserRowInsertSchema = UserRowSchema.omit(systemKeys).partial(nullableKeys);
type UserRowInsert = z.infer<typeof UserRowInsertSchema>;

const UserRowUpdateSchema = UserRowSchema.omit(systemKeys).partial();
type UserRowUpdate = z.infer<typeof UserRowUpdateSchema>;

const UserSchema = UserRowSchema.clone();
type User = z.infer<typeof UserSchema>;

const UserAccountResponseSchema = UserSchema.omit({ password_hash: true, email_verification_token_hash: true });
type UserAccountResponse = z.infer<typeof UserAccountResponseSchema>;

const UserBrandResponseSchema = UserSchema.pick({ name: true, primary_color: true });
type UserBrandResponse = z.infer<typeof UserBrandResponseSchema>;

const UserChangeEmailRequestSchema = z.object({
  email: z.email().min(10).max(50).toLowerCase().openapi({ example: 'new.email@example.com' }),
  current_password: z.string().min(8).max(50).openapi({ example: 'Password123!' }),
});
type UserChangeEmailRequest = z.infer<typeof UserChangeEmailRequestSchema>;

const UserChangePasswordRequestSchema = z.object({
  current_password: z.string().min(8).max(50).openapi({ example: 'Password123!' }),
  new_password: z.string().min(8).max(50).openapi({ example: 'Password123!' }),
});
type UserChangePasswordRequest = z.infer<typeof UserChangePasswordRequestSchema>;

const UserDeleteAccountRequestSchema = z.object({
  current_password: z.string().min(8).max(50).openapi({ example: 'Password123!' }),
  confirmation: z.literal('DELETE'),
});
type UserDeleteAccountRequest = z.infer<typeof UserDeleteAccountRequestSchema>;

const UserBrandUpdateRequestSchema = z.object({
  name: z.string().trim().min(1).max(80).nullable(),
  primary_color: z.string().max(10).nullable(),
});
type UserBrandUpdateRequest = z.infer<typeof UserBrandUpdateRequestSchema>;

const UserSettingsUpdateRequestSchema = z.object({ autodiscover_enabled: z.boolean() });
type UserSettingsUpdateRequest = z.infer<typeof UserSettingsUpdateRequestSchema>;

const UserListSchema = z.array(UserSchema);
type UserList = z.infer<typeof UserListSchema>;

const UserCreateRequestSchema = UserRowSchema.pick({
  email: true,
}).required();
type UserCreateRequest = z.infer<typeof UserCreateRequestSchema>;

const UserGetRequestSchema = z.object({
  id: z.uuid().openapi({ param: { in: 'path', name: 'id' }, example: 1 }),
});
type UserGetRequest = z.infer<typeof UserGetRequestSchema>;

const UserListRequestSchema = z
  .object({
    search: z.string().max(200),
    limit: z.number().int().min(1).max(100),
    offset: z.number().int().min(0),
    sort: z.array(z.tuple([z.enum(['id', 'email', 'created_at', 'login_at', 'trial_ends_at']), z.enum(['asc', 'desc'])])).max(2),
  })
  .partial();
type UserListRequest = z.infer<typeof UserListRequestSchema>;

const UserListResponseSchema = UserSchema.omit({
  password_hash: true,
  email_verification_token_hash: true,
})
  .strip()
  .array();
type UserListResponse = z.infer<typeof UserListResponseSchema>;

export const UserSchemas = {
  row: UserRowSchema,
  rowInsert: UserRowInsertSchema,
  rowUpdate: UserRowUpdateSchema,
  user: UserSchema,
  accountResponse: UserAccountResponseSchema,
  brandResponse: UserBrandResponseSchema,
  changeEmailRequest: UserChangeEmailRequestSchema,
  changePasswordRequest: UserChangePasswordRequestSchema,
  deleteAccountRequest: UserDeleteAccountRequestSchema,
  brandUpdateRequest: UserBrandUpdateRequestSchema,
  settingsUpdateRequest: UserSettingsUpdateRequestSchema,
  list: UserListSchema,
  createRequest: UserCreateRequestSchema,
  getRequest: UserGetRequestSchema,
  listRequest: UserListRequestSchema,
  listResponse: UserListResponseSchema,
};

export namespace IUser {
  export type row = UserRow;
  export type rowInsert = UserRowInsert;
  export type rowUpdate = UserRowUpdate;
  export type user = User;
  export type accountResponse = UserAccountResponse;
  export type brandResponse = UserBrandResponse;
  export type changeEmailRequest = UserChangeEmailRequest;
  export type changePasswordRequest = UserChangePasswordRequest;
  export type deleteAccountRequest = UserDeleteAccountRequest;
  export type brandUpdateRequest = UserBrandUpdateRequest;
  export type settingsUpdateRequest = UserSettingsUpdateRequest;
  export type list = UserList;
  export type createRequest = UserCreateRequest;
  export type getRequest = UserGetRequest;
  export type listRequest = UserListRequest;
  export type listResponse = UserListResponse;
}
