import z from 'nano-fw/zod.ts';
import { UserSchemas } from '#types/User.ts';

const credentialsSchema = z.object({
  email: z.email().min(10).max(50).openapi({ example: 'john.doe@example.com' }),
  password: z.string().min(8).max(50).openapi({ example: 'Password123!' }),
});

const AuthRegisterRequestSchema = credentialsSchema.clone();
const AuthRegisterResponseSchema = z.string();
type AuthRegisterRequest = z.infer<typeof AuthRegisterRequestSchema>;
type AuthRegisterResponse = z.infer<typeof AuthRegisterResponseSchema>;

const AuthLoginRequestSchema = credentialsSchema.clone();
const AuthLoginResponseSchema = z.string();
type AuthLoginRequest = z.infer<typeof AuthLoginRequestSchema>;
type AuthLoginResponse = z.infer<typeof AuthLoginResponseSchema>;

const AuthLogoutRequestSchema = z.object({});
const AuthLogoutResponseSchema = z.literal(true);
type AuthLogoutRequest = z.infer<typeof AuthLogoutRequestSchema>;
type AuthLogoutResponse = z.infer<typeof AuthLogoutResponseSchema>;

const AuthMeRequestSchema = z.object({});
const AuthMeResponseSchema = UserSchemas.user.omit({ password_hash: true, email_verification_token_hash: true });
type AuthMeRequest = z.infer<typeof AuthMeRequestSchema>;
type AuthMeResponse = z.infer<typeof AuthMeResponseSchema>;

export const AuthSchemas = {
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
