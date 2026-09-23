import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

const requireVariable = (name: string): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const parsePort = (value: string | undefined): number => {
  if (value === undefined || value.trim() === '') {
    return 5000;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  return port;
};

const nodeEnv = process.env.NODE_ENV?.trim() || 'development';
const configuredOrigins = process.env.CORS_ORIGIN
  ?.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const env = Object.freeze({
  DATABASE_URL: requireVariable('DATABASE_URL'),
  PORT: parsePort(process.env.PORT),
  NODE_ENV: nodeEnv,
  CORS_ORIGINS:
    configuredOrigins && configuredOrigins.length > 0
      ? configuredOrigins
      : nodeEnv === 'development'
        ? ['http://localhost:5173']
        : [],
});

export type Environment = typeof env;

