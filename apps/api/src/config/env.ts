import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().default('*'),
  APP_SECRET: z.string().min(32, 'APP_SECRET must be at least 32 characters').default('96bbfa82cd584ae092f9347b43ad3a6d9ad23047c2b1ee8b6456fc80e36ce8a2'),
  DATABASE_URL: z.string().default('mysql://4VDTMFAvrRv9avX.root:Jzo8OybebZqeJjgg@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/test?sslaccept=strict'),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().optional().default('gemini-3.5-flash-lite'),
  EMAIL_PROVIDER: z.enum(['formsubmit', 'smtp', 'console']).default('formsubmit'),
  FORMSUBMIT_ENDPOINT: z.string().optional().default(''),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  MAIL_FROM: z.string().default('Welco <no-reply@welco.local>'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error(`Invalid environment configuration: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
