import { Prisma } from '@prisma/client';

import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/app-error.js';
import type { ProfileInput } from '../utils/validation.js';

const profileWithUser = {
  user: {
    select: {
      id: true,
      email: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.UserProfileInclude;

export const getProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      createdAt: true,
      updatedAt: true,
      profile: true,
    },
  });

  if (!user) {
    throw new AppError('Invalid or expired token', 401);
  }

  const { profile, ...safeUser } = user;

  return { user: safeUser, profile };
};

export const upsertProfile = (userId: string, profile: ProfileInput) =>
  prisma.userProfile.upsert({
    where: { userId },
    create: { userId, ...profile },
    update: profile,
    include: profileWithUser,
  });
