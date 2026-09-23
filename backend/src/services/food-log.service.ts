import { MealType, Prisma } from '@prisma/client';

import { prisma } from '../config/prisma.js';
import type {
  ApiMealType,
  FoodLogData,
  FoodLogFilters,
  FoodLogInput,
  FoodLogUpdateInput,
} from '../types/food-log.js';
import { AppError } from '../utils/app-error.js';
import { getUtcDayRange, parseDateOnly } from '../utils/food-log-validation.js';
import { getNutritionRequirements } from './nutrition.service.js';

const mealTypeToDatabase: Record<ApiMealType, MealType> = {
  breakfast: MealType.BREAKFAST,
  lunch: MealType.LUNCH,
  dinner: MealType.DINNER,
  snack: MealType.SNACK,
};

const mealTypeFromDatabase: Record<MealType, ApiMealType> = {
  BREAKFAST: 'breakfast',
  LUNCH: 'lunch',
  DINNER: 'dinner',
  SNACK: 'snack',
};

const logWithFood = {
  food: { include: { nutrition: true } },
} satisfies Prisma.FoodLogInclude;

type LogWithFood = Prisma.FoodLogGetPayload<{ include: typeof logWithFood }>;

const round2 = (value: number): number => Math.round(value * 100) / 100;

const toFoodLogData = (log: LogWithFood): FoodLogData => {
  if (!log.food.nutrition) {
    throw new AppError('Nutrition information not found for this food', 422);
  }

  const quantity = Number(log.servings);

  return {
    id: log.id,
    foodId: log.foodId,
    foodName: log.food.name,
    category: log.food.category,
    servingSize: Number(log.food.servingSize),
    quantity,
    mealType: mealTypeFromDatabase[log.mealType],
    consumedAt: log.consumedAt,
    createdAt: log.createdAt,
    calories: round2(Number(log.food.nutrition.calories) * quantity),
    protein: round2(Number(log.food.nutrition.protein) * quantity),
    carbohydrates: round2(Number(log.food.nutrition.carbohydrates) * quantity),
    fat: round2(Number(log.food.nutrition.fat) * quantity),
    fiber: round2(Number(log.food.nutrition.fiber) * quantity),
  };
};

const requireFood = async (foodId: string): Promise<void> => {
  const food = await prisma.food.findUnique({
    where: { id: foodId },
    select: { id: true, nutrition: { select: { id: true } } },
  });

  if (!food) {
    throw new AppError('Food not found', 404);
  }

  if (!food.nutrition) {
    throw new AppError('Nutrition information not found for this food', 422);
  }
};

const getOwnedLog = async (userId: string, id: string): Promise<LogWithFood> => {
  const log = await prisma.foodLog.findFirst({
    where: { id, userId },
    include: logWithFood,
  });

  if (!log) {
    throw new AppError('Food log not found', 404);
  }

  return log;
};

export const createFoodLog = async (userId: string, input: FoodLogInput) => {
  await requireFood(input.foodId);

  const log = await prisma.foodLog.create({
    data: {
      userId,
      foodId: input.foodId,
      mealType: mealTypeToDatabase[input.mealType],
      servings: input.quantity,
      consumedAt: input.consumedAt ?? new Date(),
    },
    include: logWithFood,
  });

  return toFoodLogData(log);
};

export const getFoodLogById = async (userId: string, id: string) =>
  toFoodLogData(await getOwnedLog(userId, id));

export const updateFoodLog = async (
  userId: string,
  id: string,
  input: FoodLogUpdateInput,
) => {
  await getOwnedLog(userId, id);

  if (input.foodId) {
    await requireFood(input.foodId);
  }

  const log = await prisma.foodLog.update({
    where: { id },
    data: {
      ...(input.foodId === undefined ? {} : { foodId: input.foodId }),
      ...(input.mealType === undefined
        ? {}
        : { mealType: mealTypeToDatabase[input.mealType] }),
      ...(input.quantity === undefined ? {} : { servings: input.quantity }),
      ...(input.consumedAt === undefined ? {} : { consumedAt: input.consumedAt }),
    },
    include: logWithFood,
  });

  return toFoodLogData(log);
};

export const deleteFoodLog = async (userId: string, id: string) => {
  await getOwnedLog(userId, id);
  const result = await prisma.foodLog.deleteMany({ where: { id, userId } });

  if (result.count !== 1) {
    throw new AppError('Food log not found', 404);
  }

  return { id };
};

const buildConsumedAtFilter = (filters: FoodLogFilters): Prisma.DateTimeFilter | undefined => {
  if (filters.date && (filters.from || filters.to)) {
    throw new AppError('date cannot be combined with from or to', 400);
  }

  if (filters.date) {
    const range = getUtcDayRange(filters.date);
    return { gte: range.start, lt: range.end };
  }

  const from = filters.from ? parseDateOnly(filters.from, 'from') : undefined;
  const toRange = filters.to ? getUtcDayRange(filters.to) : undefined;

  if (from && toRange && from >= toRange.end) {
    throw new AppError('from must be on or before to', 400);
  }

  return from || toRange ? { ...(from ? { gte: from } : {}), ...(toRange ? { lt: toRange.end } : {}) } : undefined;
};

export const listFoodLogs = async (userId: string, filters: FoodLogFilters) => {
  const consumedAt = buildConsumedAtFilter(filters);
  const where: Prisma.FoodLogWhereInput = {
    userId,
    ...(consumedAt ? { consumedAt } : {}),
    ...(filters.mealType
      ? { mealType: mealTypeToDatabase[filters.mealType] }
      : {}),
  };
  const skip = (filters.page - 1) * filters.limit;
  const [logs, total] = await prisma.$transaction([
    prisma.foodLog.findMany({
      where,
      include: logWithFood,
      orderBy: [{ consumedAt: 'desc' }, { id: 'desc' }],
      skip,
      take: filters.limit,
    }),
    prisma.foodLog.count({ where }),
  ]);

  return {
    items: logs.map(toFoodLogData),
    page: filters.page,
    limit: filters.limit,
    total,
    totalPages: Math.ceil(total / filters.limit),
  };
};

export const getDailyIntake = async (userId: string, date: string) => {
  const items = await getDailyFoodLogs(userId, date);

  return summarizeFoodLogs(date, items);
};

export const getDailyFoodLogs = async (userId: string, date: string) => {
  const range = getUtcDayRange(date);
  const logs = await prisma.foodLog.findMany({
    where: { userId, consumedAt: { gte: range.start, lt: range.end } },
    include: logWithFood,
    orderBy: [{ consumedAt: 'asc' }, { id: 'asc' }],
  });

  return logs.map(toFoodLogData);
};

export const getFoodLogsForRange = async (
  userId: string,
  from: string,
  to: string,
) => {
  const start = parseDateOnly(from, 'from');
  const endRange = getUtcDayRange(to);
  const logs = await prisma.foodLog.findMany({
    where: { userId, consumedAt: { gte: start, lt: endRange.end } },
    include: logWithFood,
    orderBy: [{ consumedAt: 'asc' }, { id: 'asc' }],
  });

  return logs.map(toFoodLogData);
};

export const summarizeFoodLogs = (date: string, items: FoodLogData[]) => {

  return {
    date,
    calories: round2(items.reduce((sum, item) => sum + item.calories, 0)),
    protein: round2(items.reduce((sum, item) => sum + item.protein, 0)),
    carbohydrates: round2(items.reduce((sum, item) => sum + item.carbohydrates, 0)),
    fat: round2(items.reduce((sum, item) => sum + item.fat, 0)),
    fiber: round2(items.reduce((sum, item) => sum + item.fiber, 0)),
    mealCount: new Set(items.map((item) => item.mealType)).size,
    foodCount: items.length,
  };
};

export const getTodaySummary = async (userId: string) => {
  const date = new Date().toISOString().slice(0, 10);
  const [requirements, intake] = await Promise.all([
    getNutritionRequirements(userId),
    getDailyIntake(userId, date),
  ]);
  const targets = {
    calories: requirements.dailyCalories,
    protein: requirements.protein,
    carbohydrates: requirements.carbohydrates,
    fat: requirements.fat,
  };
  const consumed = {
    calories: intake.calories,
    protein: intake.protein,
    carbohydrates: intake.carbohydrates,
    fat: intake.fat,
  };

  return {
    date,
    targets,
    consumed,
    remaining: {
      calories: round2(targets.calories - consumed.calories),
      protein: round2(targets.protein - consumed.protein),
      carbohydrates: round2(targets.carbohydrates - consumed.carbohydrates),
      fat: round2(targets.fat - consumed.fat),
    },
  };
};
