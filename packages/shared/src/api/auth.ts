import { z } from 'zod';

export const LoginInputSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(200),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const RecruiterSchema = z.object({ id: z.string(), email: z.string() });
export type Recruiter = z.infer<typeof RecruiterSchema>;

export const LoginResultSchema = z.object({
  /** Opaque session token; the web app keeps it in an httpOnly cookie. */
  token: z.string(),
  expiresAt: z.string(),
  recruiter: RecruiterSchema,
});
export type LoginResult = z.infer<typeof LoginResultSchema>;
