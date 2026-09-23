import { Prisma } from '@prisma/client';

import { prisma } from '../config/prisma.js';
import type { FoodData, FoodInput, PaginatedFoods } from '../types/food.js';
import { AppError } from '../utils/app-error.js';
import { foodInputSchema } from '../utils/food-validation.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const foodWithNutrition = {
  nutrition: true,
} satisfies Prisma.FoodInclude;

type FoodWithNutrition = Prisma.FoodGetPayload<{ include: typeof foodWithNutrition }>;

const normalizePagination = (page = DEFAULT_PAGE, limit = DEFAULT_LIMIT) => {
  if (!Number.isInteger(page) || page < 1) {
    throw new AppError('page must be a positive integer', 400);
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new AppError(`limit must be an integer between 1 and ${MAX_LIMIT}`, 400);
  }

  return { page, limit, skip: (page - 1) * limit };
};

const requireValidFoodId = (id: string): string => {
  if (!UUID_PATTERN.test(id)) {
    throw new AppError('Invalid food ID', 400);
  }

  return id;
};

const toFoodData = (food: FoodWithNutrition): FoodData => {
  if (!food.nutrition) {
    throw new AppError('Nutrition information not found for this food', 404);
  }

  return {
    id: food.id,
    name: food.name,
    category: food.category,
    servingSize: Number(food.servingSize),
    calories: Number(food.nutrition.calories),
    protein: Number(food.nutrition.protein),
    carbohydrates: Number(food.nutrition.carbohydrates),
    fat: Number(food.nutrition.fat),
    fiber: Number(food.nutrition.fiber),
  };
};

const toPaginatedFoods = (
  foods: FoodWithNutrition[],
  page: number,
  limit: number,
  total: number,
): PaginatedFoods => ({
  items: foods.map(toFoodData),
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

export const createFood = async (input: FoodInput): Promise<FoodData> => {
  const foodInput = foodInputSchema.parse(input);

  try {
    const food = await prisma.food.create({
      data: {
        name: foodInput.name,
        category: foodInput.category,
        servingSize: foodInput.servingSize,
        nutrition: { create: foodInput.nutrition },
      },
      include: foodWithNutrition,
    });

    return toFoodData(food);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('A food with this name already exists', 409);
    }

    throw error;
  }
};

export const getFoodById = async (id: string): Promise<FoodData> => {
  const food = await prisma.food.findUnique({
    where: { id: requireValidFoodId(id) },
    include: foodWithNutrition,
  });

  if (!food) {
    throw new AppError('Food not found', 404);
  }

  return toFoodData(food);
};

export const getFoodNutrition = async (id: string): Promise<FoodData> => getFoodById(id);

export const listFoods = async (page = DEFAULT_PAGE, limit = DEFAULT_LIMIT) => {
  const pagination = normalizePagination(page, limit);
  const [foods, total] = await prisma.$transaction([
    prisma.food.findMany({
      include: foodWithNutrition,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.food.count(),
  ]);

  return toPaginatedFoods(foods, pagination.page, pagination.limit, total);
};

export const searchFoods = async (
  query: string,
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
) => {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    throw new AppError('Search query must not be empty', 400);
  }

  const pagination = normalizePagination(page, limit);
  const where = {
    name: { contains: normalizedQuery, mode: 'insensitive' as const },
  };
  const [foods, total] = await prisma.$transaction([
    prisma.food.findMany({
      where,
      include: foodWithNutrition,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.food.count({ where }),
  ]);

  return toPaginatedFoods(foods, pagination.page, pagination.limit, total);
};

