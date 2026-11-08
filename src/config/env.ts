import Joi from 'joi';
export const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3000),
  MONGODB_URI: Joi.string().pattern(/^mongodb(\+srv)?:\/\//).required(),
  SERVICE_API_KEY: Joi.string().min(32).required(),
  CULQI_MODE: Joi.string().valid('test', 'live').default('test'),
  CULQI_SECRET_KEY: Joi.string().pattern(/^sk_(test|live)_/).required(),
  CULQI_PUBLIC_KEY: Joi.string().pattern(/^pk_(test|live)_/).required(),
  CULQI_API_URL: Joi.string().valid('https://api.culqi.com/v2').default('https://api.culqi.com/v2'),
  CULQI_WEBHOOK_TOKEN: Joi.string().min(32).required(),
  AGROCLOUD_EVENT_URL: Joi.string().allow('').optional(),
  AGROCLOUD_EVENT_SECRET: Joi.string().min(32).required(),
  OUTBOX_INTERVAL_MS: Joi.number().min(5000).default(30000),
}).unknown(true).custom((env: Record<string, unknown>, helpers) => {
  const mode = env.CULQI_MODE;
  if (typeof env.CULQI_SECRET_KEY !== 'string' || !env.CULQI_SECRET_KEY.startsWith(`sk_${mode}_`)) return helpers.error('any.invalid');
  if (typeof env.CULQI_PUBLIC_KEY !== 'string' || !env.CULQI_PUBLIC_KEY.startsWith(`pk_${mode}_`)) return helpers.error('any.invalid');
  if (env.NODE_ENV === 'production' && typeof env.AGROCLOUD_EVENT_URL === 'string' && env.AGROCLOUD_EVENT_URL && !env.AGROCLOUD_EVENT_URL.startsWith('https://')) return helpers.error('any.invalid');
  return env;
});
