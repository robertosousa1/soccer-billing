import { env } from "./env";

export const authConfig = {
  secret: env.jwtSecret,
  expiresIn: env.jwtExpiresIn,
};
