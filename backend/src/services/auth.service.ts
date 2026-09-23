import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';

import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/app-error.js';
import type { CredentialsInput } from '../utils/validation.js';

const safeUserSelect = {
  id: true,
  email: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

const createAccessToken = (userId: string): string =>
  jwt.sign({}, env.JWT_SECRET, {
    subject: userId,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });

export const registerUser = async ({ email, password }: CredentialsInput) => {
  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  if (existingUser) {
    throw new AppError('An account with this email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    return await prisma.user.create({
      data: { email, passwordHash },
      select: safeUserSelect,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('An account with this email already exists', 409);
    }

    throw error;
  }
};

export const loginUser = async ({ email, password }: CredentialsInput) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { ...safeUserSelect, passwordHash: true },
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError('Invalid email or password', 401);
  }

  const { passwordHash: _passwordHash, ...safeUser } = user;

  return {
    accessToken: createAccessToken(user.id),
    user: safeUser,
  };
};

