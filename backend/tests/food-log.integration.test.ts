import crypto from 'node:crypto';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { app } from '../src/app.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/config/prisma.js';

const marker = crypto.randomUUID();
const testDate = '2026-09-23';
let userId = '';
let otherUserId = '';
let token = '';
let otherToken = '';
let foodId = '';
let ownLogId = '';
let otherLogId = '';

const authorize = (requestBuilder: request.Test, accessToken = token) =>
  requestBuilder.set('Authorization', `Bearer ${accessToken}`);

describe('food logging and intake API', () => {
  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('test-only-password', 4);
    const [user, otherUser, food] = await Promise.all([
      prisma.user.create({
        data: {
          email: `day7-${marker}@example.com`,
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
        data: { email: `day7-other-${marker}@example.com`, passwordHash },
      }),
      prisma.food.create({
        data: {
          name: `Day7 Test Food ${marker}`,
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
    foodId = food.id;
    token = jwt.sign({}, env.JWT_SECRET, { subject: userId, expiresIn: '10m' });
    otherToken = jwt.sign({}, env.JWT_SECRET, { subject: otherUserId, expiresIn: '10m' });

    const otherLog = await prisma.foodLog.create({
      data: {
        userId: otherUserId,
        foodId,
        mealType: 'BREAKFAST',
        servings: 1,
        consumedAt: new Date(`${testDate}T07:00:00.000Z`),
      },
    });
    otherLogId = otherLog.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
    await prisma.food.deleteMany({ where: { id: foodId } });
    await prisma.$disconnect();
  });

  it('requires authentication', async () => {
    const response = await request(app).get('/api/food-logs');

    expect(response.status).toBe(401);
  });

  it('creates a food log for the authenticated user', async () => {
    const response = await authorize(request(app).post('/api/food-logs')).send({
      foodId,
      mealType: 'breakfast',
      quantity: 1.5,
      consumedAt: `${testDate}T08:30:00.000Z`,
    });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      foodId,
      quantity: 1.5,
      mealType: 'breakfast',
      calories: 150,
      protein: 15,
      carbohydrates: 30,
      fat: 7.5,
      fiber: 3,
    });
    ownLogId = response.body.data.id;
  });

  it('rejects an unknown food reference', async () => {
    const response = await authorize(request(app).post('/api/food-logs')).send({
      foodId: crypto.randomUUID(),
      mealType: 'lunch',
      quantity: 1,
    });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Food not found');
  });

  it.each([
    [{ foodId, mealType: 'lunch', quantity: 0 }, 'quantity'],
    [{ foodId, mealType: 'brunch', quantity: 1 }, 'mealType'],
    [{ foodId, mealType: 'lunch', quantity: 1, consumedAt: 'not-a-date' }, 'consumedAt'],
  ])('rejects invalid create input', async (body, _field) => {
    const response = await authorize(request(app).post('/api/food-logs')).send(body);

    expect(response.status).toBe(400);
  });

  it('gets an owned food log', async () => {
    const response = await authorize(request(app).get(`/api/food-logs/${ownLogId}`));

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(ownLogId);
  });

  it('updates an owned food log', async () => {
    const response = await authorize(request(app).put(`/api/food-logs/${ownLogId}`)).send({
      mealType: 'lunch',
      quantity: 2,
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ mealType: 'lunch', quantity: 2, calories: 200 });
  });

  it.each(['get', 'put', 'delete'] as const)(
    'does not allow a user to %s another user food log',
    async (method) => {
      const builder = request(app)[method](`/api/food-logs/${otherLogId}`);
      const response = await authorize(builder).send(method === 'put' ? { quantity: 2 } : undefined);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Food log not found');
    },
  );

  it('deletes an owned food log', async () => {
    const response = await authorize(request(app).delete(`/api/food-logs/${ownLogId}`));

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(ownLogId);
    expect(await prisma.foodLog.findUnique({ where: { id: ownLogId } })).toBeNull();
  });

  it('supports pagination, date and meal filters with newest-first ordering', async () => {
    await prisma.foodLog.deleteMany({ where: { userId } });
    await prisma.foodLog.createMany({
      data: [
        { userId, foodId, mealType: 'BREAKFAST', servings: 1, consumedAt: new Date(`${testDate}T07:00:00.000Z`) },
        { userId, foodId, mealType: 'LUNCH', servings: 1, consumedAt: new Date(`${testDate}T12:00:00.000Z`) },
        { userId, foodId, mealType: 'DINNER', servings: 1, consumedAt: new Date('2026-09-24T18:00:00.000Z') },
      ],
    });

    const paged = await authorize(request(app).get('/api/food-logs?page=1&limit=2'));
    expect(paged.status).toBe(200);
    expect(paged.body.data).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
    expect(new Date(paged.body.data.items[0].consumedAt).getTime()).toBeGreaterThan(
      new Date(paged.body.data.items[1].consumedAt).getTime(),
    );

    const byDate = await authorize(request(app).get(`/api/food-logs?date=${testDate}`));
    expect(byDate.body.data.total).toBe(2);

    const byMeal = await authorize(request(app).get('/api/food-logs?mealType=breakfast'));
    expect(byMeal.body.data.total).toBe(1);
    expect(byMeal.body.data.items[0].mealType).toBe('breakfast');
  });

  it('aggregates daily calories, macros, fiber and counts', async () => {
    await prisma.foodLog.deleteMany({ where: { userId } });
    await prisma.foodLog.createMany({
      data: [
        { userId, foodId, mealType: 'BREAKFAST', servings: 1, consumedAt: new Date(`${testDate}T08:00:00.000Z`) },
        { userId, foodId, mealType: 'LUNCH', servings: 2, consumedAt: new Date(`${testDate}T13:00:00.000Z`) },
      ],
    });

    const response = await authorize(
      request(app).get(`/api/food-logs/summary?date=${testDate}`),
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      date: testDate,
      calories: 300,
      protein: 30,
      carbohydrates: 60,
      fat: 15,
      fiber: 6,
      mealCount: 2,
      foodCount: 2,
    });
  });

  it('combines today targets, consumed values and remaining values', async () => {
    await prisma.foodLog.deleteMany({ where: { userId } });
    await prisma.foodLog.create({
      data: {
        userId,
        foodId,
        mealType: 'SNACK',
        servings: 1,
        consumedAt: new Date(),
      },
    });

    const response = await authorize(request(app).get('/api/food-logs/summary/today'));

    expect(response.status).toBe(200);
    expect(response.body.data.targets).toEqual({
      calories: 2759,
      protein: 128,
      carbohydrates: 389,
      fat: 77,
    });
    expect(response.body.data.consumed).toEqual({
      calories: 100,
      protein: 10,
      carbohydrates: 20,
      fat: 5,
    });
    expect(response.body.data.remaining).toEqual({
      calories: 2659,
      protein: 118,
      carbohydrates: 369,
      fat: 72,
    });
  });
});

