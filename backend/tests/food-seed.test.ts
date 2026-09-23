import { describe, expect, it } from 'vitest';

import { seedFoodData } from '../prisma/seed-data.js';
import { seedFoods } from '../prisma/seed.js';
import { prisma } from '../src/config/prisma.js';

describe('food seed', () => {
  it('succeeds and remains idempotent', async () => {
    const names = seedFoodData.map((food) => food.name);

    expect(await seedFoods(prisma)).toBe(seedFoodData.length);
    const firstCount = await prisma.food.count({ where: { name: { in: names } } });

    expect(await seedFoods(prisma)).toBe(seedFoodData.length);
    const secondCount = await prisma.food.count({ where: { name: { in: names } } });

    expect(firstCount).toBe(seedFoodData.length);
    expect(secondCount).toBe(firstCount);
  });
});

