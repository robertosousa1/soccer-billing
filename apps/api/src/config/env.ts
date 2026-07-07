import "dotenv/config";

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3333),
  databaseUrl: required("DATABASE_URL"),
  directUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  jwtSecret: required("JWT_SECRET", "dev-secret"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  storageDriver: (process.env.STORAGE_DRIVER ?? "local") as "local" | "s3",
  storageLocalDir: process.env.STORAGE_LOCAL_DIR ?? "./storage",
  s3Bucket: process.env.S3_BUCKET ?? "",
  s3Region: process.env.S3_REGION ?? "us-east-1",
  s3Endpoint: process.env.S3_ENDPOINT ?? "",
  sentryDsn: process.env.SENTRY_DSN ?? "",
  newRelicLicenseKey: process.env.NEW_RELIC_LICENSE_KEY ?? "",
  emailApiKey: required("EMAIL_API_KEY", ""),
  emailFrom: process.env.EMAIL_FROM ?? "noreply@pelada.app",
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  recaptchaSecret: process.env.RECAPTCHA_SECRET_KEY ?? "",
};
