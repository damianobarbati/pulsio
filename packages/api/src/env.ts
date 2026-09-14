import z from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['test', 'development', 'production']),
    APP_ENV: z.enum(['local', 'development', 'staging', 'production']),
    DEBUG: z.string().default(''),
    TZ: z.string().default('UTC'),
    DB_URI: z.string().min(1),
    CH_URI: z.string().min(1),
    CACHE_URI: z.string().min(1),
    SMTP_URI: z.string().min(1),
    //
    EMAIL_FROM: z.string().min(1),
    QUEUE_NAME: z.string().min(1),
    BATCH_SIZE: z.coerce.number().min(1),
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_PUBLISHABLE_KEY: z.string().min(1),
    STRIPE_WS_SECRET_KEY: z.string().min(1),
    //
    SUPERADMIN_USERNAME: z.string().min(1),
    SUPERADMIN_PASSWORD: z.string().min(1),
    DASHBOARD_USERNAME: z.string().min(1),
    DASHBOARD_PASSWORD: z.string().min(1),
    //
    COOKIE_DOMAIN: z.string().nullable(),
    API_URL: z.url().min(1),
    WEBSITE_URL: z.url().min(1),
    WEBAPP_URL: z.url().min(1),
    SUPERADMIN_URL: z.url().min(1),
  })
  .strip();

const ENV = envSchema.parse(process.env);

export default ENV;
