import crypto from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { createFood } from '../src/services/food.service.js';

const marker = `Day6Api-${crypto.randomUUID()}`;
let foodId = '';

describe('food API', () => {
  beforeAll(async () => {
    const food = await createFood({
      name: `${marker} Chicken Bowl`,
      category: 'Test Food',
      servingSize: 100,
      nutrition: { calories: 190, protein: 20, carbohydrates: 14, fat: 6, fiber: 2 },
    });
    foodId = food.id;
  });

  afterAll(async () => {
    await prisma.food.deleteMany({ where: { name: { startsWith: marker } } });
    await prisma.$disconnect();
  });

  it('lists foods', async () => {
    const response = await request(app).get('/api/foods?page=1&limit=20');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.items).toEqual(expect.any(Array));
    expect(response.body.data).toMatchObject({ page: 1, limit: 20 });
  });

  it('searches foods', async () => {
    const response = await request(app).get(`/api/foods/search?q=${encodeURIComponent(marker.toLowerCase())}`);

    expect(response.status).toBe(200);
    expect(response.body.data.total).toBe(1);
    expect(response.body.data.items[0].id).toBe(foodId);
  });

  it('gets a food by ID', async () => {
    const response = await request(app).get(`/api/foods/${foodId}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ id: foodId, calories: 190, protein: 20 });
  });

  it('rejects an invalid food ID', async () => {
    const response = await request(app).get('/api/foods/not-a-uuid');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ success: false, message: 'Invalid food ID' });
  });

  it('returns 404 for a missing food', async () => {
    const response = await request(app).get(`/api/foods/${crypto.randomUUID()}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ success: false, message: 'Food not found' });
  });
});

