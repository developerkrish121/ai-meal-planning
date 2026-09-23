import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

const parsedPort = Number.parseInt(process.env.PORT ?? '3000', 10);

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number.isNaN(parsedPort) ? 3000 : parsedPort,
};

