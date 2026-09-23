import path from 'node:path';

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

import { foodInputSchema } from '../src/utils/food-validation.js';
import { seedFoodData } from './seed-data.js';

export const seedFoods = async (client: PrismaClient): Promise<number> => {
  const foods = seedFoodData.map((food) => foodInputSchema.parse(food));

  await client.$transaction(
    foods.map((food) =>
      client.food.upsert({
        where: { name: food.name },
        create: {
          name: food.name,
          category: food.category,
          servingSize: food.servingSize,
          nutrition: { create: food.nutrition },
        },
        update: {
          category: food.category,
          servingSize: food.servingSize,
          nutrition: {
            upsert: {
              create: food.nutrition,
              update: food.nutrition,
            },
          },
        },
      }),
    ),
  );

  return foods.length;
};

const main = async (): Promise<void> => {
  dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true });
  dotenv.config({ path: path.resolve(process.cwd(), '../.env'), quiet: true });

  const connectionString = process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error('Missing required environment variable: DATABASE_URL');
  }

  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    const count = await seedFoods(client);
    console.log(`Seeded ${count} foods with nutrition data.`);
  } finally {
    await client.$disconnect();
  }
};

if (require.main === module) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Food seed failed');
    process.exitCode = 1;
  });
}

