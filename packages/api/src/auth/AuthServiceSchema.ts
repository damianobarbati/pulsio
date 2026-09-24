import z from 'nano-fw/zod.ts';
import { UserSchema } from 'types/User.ts';

const credentialsSchema = z.object({
  email: z.email().openapi({ example: 'john.doe@example.com' }),
  password: z.string().min(1).max(20).openapi({ example: 'Password123!' }),
});

export const AuthRegisterRequestSchema = credentialsSchema.clone();
export const AuthRegisterResponseSchema = z.string().regex(/^[a-f0-9]{64}$/);
export type AuthRegisterRequest = z.infer<typeof AuthRegisterRequestSchema>;
export type AuthRegisterResponse = z.infer<typeof AuthRegisterResponseSchema>;

export const AuthLoginRequestSchema = credentialsSchema.clone();
export const AuthLoginResponseSchema = z.string().regex(/^[a-f0-9]{64}$/);
export type AuthLoginRequest = z.infer<typeof AuthLoginRequestSchema>;
export type AuthLoginResponse = z.infer<typeof AuthLoginResponseSchema>;

export const AuthLogoutRequestSchema = z.object({});
export const AuthLogoutResponseSchema = z.literal(true);
export type AuthLogoutRequest = z.infer<typeof AuthLogoutRequestSchema>;
export type AuthLogoutResponse = z.infer<typeof AuthLogoutResponseSchema>;

export const AuthMeRequestSchema = z.object({});
export const AuthMeResponseSchema = UserSchema;
export type AuthMeRequest = z.infer<typeof AuthMeRequestSchema>;
export type AuthMeResponse = z.infer<typeof AuthMeResponseSchema>;

export const AuthSchema = {
  registerRequest: AuthRegisterRequestSchema,
  registerResponse: AuthRegisterResponseSchema,
  loginRequest: AuthLoginRequestSchema,
  loginResponse: AuthLoginResponseSchema,
  logoutRequest: AuthLogoutRequestSchema,
  logoutResponse: AuthLogoutResponseSchema,
  meRequest: AuthMeRequestSchema,
  meResponse: AuthMeResponseSchema,
};

export namespace IAuth {
  export type registerRequest = AuthRegisterRequest;
  export type registerResponse = AuthRegisterResponse;
  export type loginRequest = AuthLoginRequest;
  export type loginResponse = AuthLoginResponse;
  export type logoutRequest = AuthLogoutRequest;
  export type logoutResponse = AuthLogoutResponse;
  export type meRequest = AuthMeRequest;
  export type meResponse = AuthMeResponse;
}
