import { env } from "./env";

export const storageConfig = {
  driver: env.storageDriver,
  localDir: env.storageLocalDir,
  s3Bucket: env.s3Bucket,
  s3Region: env.s3Region,
};
