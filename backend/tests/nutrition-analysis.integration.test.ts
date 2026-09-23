import crypto from 'node:crypto';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { app } from '../src/app.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/config/prisma.js';
import { getProgressStatus } from '../src/services/nutrition-analysis.service.js';

const marker = crypto.randomUUID();
const analysisDate = '2026-08-01';
const overDate = '2026-08-03';
const zeroDate = '2026-08-10';
let userId = '';
let otherUserId = '';
let noProfileUserId = '';
let token = '';
let otherToken = '';
let noProfileToken = '';
let foodId = '';

const authorize = (builder: request.Test, accessToken = token) =>
  builder.set('Authorization', `Bearer ${accessToken}`);

describe('nutrition analysis API', () => {
  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('test-only-password', 4);
    const [user, otherUser, noProfileUser, food] = await Promise.all([
      prisma.user.create({
        data: {
          email: `day8-${marker}@example.com`,
          passwordHash,
          profile: {
            create: {
              age: 30,
              gender: 'male',
              height: 180,
              weight: 80,
              activityLevel: 'moderately-active',
              fitnessGoal: 'maintenance',
            },
          },
        },
      }),
      prisma.user.create({
        data: {
          email: `day8-other-${marker}@example.com`,
          passwordHash,
          profile: {
            create: {
              age: 30,
              gender: 'male',
              height: 180,
              weight: 80,
              activityLevel: 'moderately-active',
              fitnessGoal: 'maintenance',
            },
          },
        },
      }),
      prisma.user.create({
        data: { email: `day8-no-profile-${marker}@example.com`, passwordHash },
      }),
      prisma.food.create({
        data: {
          name: `Day8 Analysis Food ${marker}`,
          category: 'Test',
          servingSize: 100,
          nutrition: {
            create: { calories: 100, protein: 10, carbohydrates: 20, fat: 5, fiber: 2 },
          },
        },
      }),
    ]);

    userId = user.id;
    otherUserId = otherUser.id;
    noProfileUserId = noProfileUser.id;
    foodId = food.id;
    token = jwt.sign({}, env.JWT_SECRET, { subject: userId, expiresIn: '10m' });
    otherToken = jwt.sign({}, env.JWT_SECRET, { subject: otherUserId, expiresIn: '10m' });
    noProfileToken = jwt.sign({}, env.JWT_SECRET, {
      subject: noProfileUserId,
      expiresIn: '10m',
    });

    await prisma.foodLog.createMany({
      data: [
        { userId, foodId, mealType: 'BREAKFAST', servings: 1, consumedAt: new Date(`${analysisDate}T08:00:00.000Z`) },
        { userId, foodId, mealType: 'LUNCH', servings: 1.5, consumedAt: new Date(`${analysisDate}T13:00:00.000Z`) },
        { userId, foodId, mealType: 'DINNER', servings: 31, consumedAt: new Date(`${overDate}T19:00:00.000Z`) },
        { userId: otherUserId, foodId, mealType: 'SNACK', servings: 50, consumedAt: new Date(`${analysisDate}T16:00:00.000Z`) },
      ],
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { id: { in: [userId, otherUserId, noProfileUserId] } },
    });
    await prisma.food.deleteMany({ where: { id: foodId } });
    await prisma.$disconnect();
  });

  it('rejects unauthenticated analysis requests', async () => {
    const response = await request(app).get(
      `/api/nutrition/analysis?date=${analysisDate}`,
    );

    expect(response.status).toBe(401);
  });

  it('returns the same profile-required error for an incomplete user', async () => {
    const response = await authorize(
      request(app).get(`/api/nutrition/analysis?date=${analysisDate}`),
      noProfileToken,
    );

    expect(response.status).toBe(422);
    expect(response.body.message).toBe('A complete user profile is required');
  });

  it('calculates targets, consumed, remaining and rounded percentages', async () => {
    const response = await authorize(
      request(app).get(`/api/nutrition/analysis?date=${analysisDate}`),
    );

    expect(response.status).toBe(200);
    expect(response.body.data.targets).toEqual({
      calories: 2759,
      protein: 128,
      carbohydrates: 389,
      fat: 77,
      fiber: 30,
    });
    expect(response.body.data.consumed).toEqual({
      calories: 250,
      protein: 25,
      carbohydrates: 50,
      fat: 12.5,
      fiber: 5,
    });
    expect(response.body.data.remaining).toEqual({
      calories: 2509,
      protein: 103,
      carbohydrates: 339,
      fat: 64.5,
      fiber: 25,
    });
    expect(response.body.data.percentConsumed).toEqual({
      calories: 9,
      protein: 20,
      carbohydrates: 13,
      fat: 16,
      fiber: 17,
    });
  });

  it('returns meal and food breakdowns using only the authenticated user data', async () => {
    const response = await authorize(
      request(app).get(`/api/nutrition/analysis?date=${analysisDate}`),
    );

    expect(response.body.data.mealBreakdown).toEqual([
      { mealType: 'breakfast', calories: 100, protein: 10, carbohydrates: 20, fat: 5 },
      { mealType: 'lunch', calories: 150, protein: 15, carbohydrates: 30, fat: 7.5 },
    ]);
    expect(response.body.data.foods).toHaveLength(2);
    expect(response.body.data.foods[1]).toMatchObject({
      foodId,
      quantity: 1.5,
      mealType: 'lunch',
      calories: 150,
    });
  });

  it('returns zero intake and safe zero percentages on an unlogged day', async () => {
    const response = await authorize(
      request(app).get(`/api/nutrition/analysis?date=${zeroDate}`),
    );

    expect(response.status).toBe(200);
    expect(response.body.data.consumed).toEqual({
      calories: 0,
      protein: 0,
      carbohydrates: 0,
      fat: 0,
      fiber: 0,
    });
    expect(response.body.data.percentConsumed).toEqual({
      calories: 0,
      protein: 0,
      carbohydrates: 0,
      fat: 0,
      fiber: 0,
    });
    expect(response.body.data.mealBreakdown).toEqual([]);
    expect(response.body.data.foods).toEqual([]);
  });

  it('allows negative remaining values when intake exceeds targets', async () => {
    const response = await authorize(
      request(app).get(`/api/nutrition/analysis?date=${overDate}`),
    );

    expect(response.status).toBe(200);
    expect(response.body.data.remaining.calories).toBe(-341);
    expect(response.body.data.remaining.protein).toBe(-182);
    expect(response.body.data.goalProgress).toEqual({
      goal: 'maintenance',
      calorieStatus: 'over_target',
      proteinStatus: 'over_target',
    });
  });

  it.each([
    [89, 100, 'under_target'],
    [90, 100, 'near_target'],
    [110, 100, 'near_target'],
    [111, 100, 'over_target'],
  ] as const)('classifies deterministic progress thresholds', (consumed, target, expected) => {
    expect(getProgressStatus(consumed, target)).toBe(expected);
  });

  it('calculates period totals, averages, calendar days and logged days', async () => {
    const response = await authorize(
      request(app).get(
        `/api/nutrition/analysis/period?from=${analysisDate}&to=${overDate}`,
      ),
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      from: analysisDate,
      to: overDate,
      days: 3,
      dailyAverage: {
        calories: 1675,
        protein: 167.5,
        carbohydrates: 335,
        fat: 83.75,
        fiber: 33.5,
      },
      total: {
        calories: 3350,
        protein: 335,
        carbohydrates: 670,
        fat: 167.5,
        fiber: 67,
      },
      loggedDays: 2,
    });
  });

  it('returns zero averages when a period has no logged days', async () => {
    const response = await authorize(
      request(app).get('/api/nutrition/analysis/period?from=2026-07-01&to=2026-07-02'),
    );

    expect(response.status).toBe(200);
    expect(response.body.data.loggedDays).toBe(0);
    expect(response.body.data.total).toEqual({
      calories: 0,
      protein: 0,
      carbohydrates: 0,
      fat: 0,
      fiber: 0,
    });
    expect(response.body.data.dailyAverage).toEqual(response.body.data.total);
  });

  it('accepts a maximum 31-day period', async () => {
    const response = await authorize(
      request(app).get('/api/nutrition/analysis/period?from=2026-01-01&to=2026-01-31'),
    );

    expect(response.status).toBe(200);
    expect(response.body.data.days).toBe(31);
  });

  it.each([
    ['/api/nutrition/analysis/period?from=2026-01-01&to=2026-02-01', 'cannot exceed'],
    ['/api/nutrition/analysis/period?from=2026-02-02&to=2026-02-01', 'on or before'],
    ['/api/nutrition/analysis?date=2026-02-30', 'valid calendar date'],
  ])('rejects invalid analysis dates and ranges', async (url, message) => {
    const response = await authorize(request(app).get(url));

    expect(response.status).toBe(400);
    expect(response.body.message).toContain(message);
  });

  it('does not include another user logs in period analysis', async () => {
    const response = await authorize(
      request(app).get(
        `/api/nutrition/analysis/period?from=${analysisDate}&to=${analysisDate}`,
      ),
    );

    expect(response.body.data.total.calories).toBe(250);
    expect(response.body.data.loggedDays).toBe(1);
  });
});
