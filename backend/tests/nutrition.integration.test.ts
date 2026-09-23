import crypto from 'node:crypto';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { app } from '../src/app.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/config/prisma.js';

const email = `day5-${crypto.randomUUID()}@example.com`;
let userId = '';
let accessToken = '';

describe('GET /api/nutrition/requirements', () => {
  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash('test-only-password', 4),
      },
      select: { id: true },
    });

    userId = user.id;
    accessToken = jwt.sign({}, env.JWT_SECRET, { subject: userId, expiresIn: '5m' });
  });

  afterAll(async () => {
    if (userId) {
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  it('rejects an unauthenticated request', async () => {
    const response = await request(app).get('/api/nutrition/requirements');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('rejects an authenticated user without a profile', async () => {
    const response = await request(app)
      .get('/api/nutrition/requirements')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      success: false,
      message: 'A complete user profile is required',
    });
  });

  it('returns calculated requirements for a complete profile', async () => {
    await prisma.userProfile.create({
      data: {
        userId,
        age: 30,
        gender: 'male',
        height: 180,
        weight: 80,
        activityLevel: 'moderately-active',
        fitnessGoal: 'maintenance',
      },
    });

    const response = await request(app)
      .get('/api/nutrition/requirements')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        bmr: 1780,
        tdee: 2759,
        dailyCalories: 2759,
        protein: 128,
        carbohydrates: 389,
        fat: 77,
      },
    });
  });
});

