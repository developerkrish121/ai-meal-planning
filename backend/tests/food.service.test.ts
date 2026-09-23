import crypto from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '../src/config/prisma.js';
import {
  createFood,
  getFoodById,
  getFoodNutrition,
  listFoods,
  searchFoods,
} from '../src/services/food.service.js';
import { AppError } from '../src/utils/app-error.js';

const marker = `Day6-${crypto.randomUUID()}`;
let firstFoodId = '';

describe('food service', () => {
  beforeAll(async () => {
    const firstFood = await createFood({
      name: `${marker} Alpha Chicken`,
      category: 'Test Protein',
      servingSize: 100,
      nutrition: { calories: 165, protein: 31, carbohydrates: 0, fat: 3.6, fiber: 0 },
    });
    firstFoodId = firstFood.id;

    await createFood({
      name: `${marker} Beta Rice`,
      category: 'Test Grain',
      servingSize: 100,
      nutrition: { calories: 130, protein: 2.7, carbohydrates: 28, fat: 0.3, fiber: 0.4 },
    });
    await createFood({
      name: `${marker} Gamma Apple`,
      category: 'Test Fruit',
      servingSize: 100,
      nutrition: { calories: 52, protein: 0.3, carbohydrates: 13.8, fat: 0.2, fiber: 2.4 },
    });
  });

  afterAll(async () => {
    await prisma.food.deleteMany({ where: { name: { startsWith: marker } } });
    await prisma.$disconnect();
  });

  it('gets a food by ID', async () => {
    const food = await getFoodById(firstFoodId);

    expect(food.name).toBe(`${marker} Alpha Chicken`);
  });

  it('rejects a missing food', async () => {
    await expect(getFoodById(crypto.randomUUID())).rejects.toMatchObject<AppError>({
      statusCode: 404,
      message: 'Food not found',
    });
  });

  it('searches foods by name', async () => {
    const result = await searchFoods(`${marker} Alpha`);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe(firstFoodId);
  });

  it('searches case-insensitively', async () => {
    const result = await searchFoods(marker.toLowerCase());

    expect(result.total).toBe(3);
    expect(result.items.map((food) => food.name)).toEqual([...result.items.map((food) => food.name)].sort());
  });

  it('rejects an empty search query', async () => {
    await expect(searchFoods('   ')).rejects.toMatchObject<AppError>({ statusCode: 400 });
  });

  it('paginates food results', async () => {
    const firstPage = await searchFoods(marker, 1, 2);
    const secondPage = await searchFoods(marker, 2, 2);

    expect(firstPage).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
    expect(firstPage.items).toHaveLength(2);
    expect(secondPage.items).toHaveLength(1);
  });

  it('returns flattened nutrition information', async () => {
    const food = await getFoodNutrition(firstFoodId);

    expect(food).toMatchObject({ calories: 165, protein: 31, carbohydrates: 0, fat: 3.6, fiber: 0 });
  });

  it('lists foods with pagination metadata', async () => {
    const result = await listFoods(1, 10);

    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.items.length).toBeLessThanOrEqual(10);
    expect(result.totalPages).toBe(Math.ceil(result.total / 10));
  });
});

