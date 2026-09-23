import { DAILY_FIBER_TARGET_GRAMS } from '../config/nutrition.constants.js';
import type { ApiMealType, FoodLogData } from '../types/food-log.js';
import { AppError } from '../utils/app-error.js';
import { parseDateOnly } from '../utils/food-log-validation.js';
import {
  getDailyFoodLogs,
  getDailyIntake,
  getFoodLogsForRange,
  summarizeFoodLogs,
} from './food-log.service.js';
import { getNutritionRequirements } from './nutrition.service.js';
import { getProfile } from './profile.service.js';

type ProgressStatus = 'under_target' | 'near_target' | 'over_target';

const mealOrder: ApiMealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const round2 = (value: number): number => Math.round(value * 100) / 100;

export const getProgressStatus = (consumed: number, target: number): ProgressStatus => {
  if (target <= 0) {
    return consumed > 0 ? 'over_target' : 'near_target';
  }

  const ratio = consumed / target;

  if (ratio < 0.9) {
    return 'under_target';
  }

  return ratio <= 1.1 ? 'near_target' : 'over_target';
};

const percentage = (consumed: number, target: number): number =>
  target > 0 ? Math.round((consumed / target) * 100) : 0;

const sumFoods = (foods: FoodLogData[]) => ({
  calories: round2(foods.reduce((sum, food) => sum + food.calories, 0)),
  protein: round2(foods.reduce((sum, food) => sum + food.protein, 0)),
  carbohydrates: round2(foods.reduce((sum, food) => sum + food.carbohydrates, 0)),
  fat: round2(foods.reduce((sum, food) => sum + food.fat, 0)),
  fiber: round2(foods.reduce((sum, food) => sum + food.fiber, 0)),
});

const buildMealBreakdown = (foods: FoodLogData[]) =>
  mealOrder.flatMap((mealType) => {
    const mealFoods = foods.filter((food) => food.mealType === mealType);

    if (mealFoods.length === 0) {
      return [];
    }

    const totals = sumFoods(mealFoods);
    return [
      {
        mealType,
        calories: totals.calories,
        protein: totals.protein,
        carbohydrates: totals.carbohydrates,
        fat: totals.fat,
      },
    ];
  });

const buildFoodBreakdown = (foods: FoodLogData[]) =>
  foods.map((food) => ({
    foodId: food.foodId,
    name: food.foodName,
    quantity: food.quantity,
    mealType: food.mealType,
    calories: food.calories,
    protein: food.protein,
    carbohydrates: food.carbohydrates,
    fat: food.fat,
  }));

export const getDailyNutritionAnalysis = async (userId: string, date: string) => {
  parseDateOnly(date);
  const [requirements, intake, foods, profileResult] = await Promise.all([
    getNutritionRequirements(userId),
    getDailyIntake(userId, date),
    getDailyFoodLogs(userId, date),
    getProfile(userId),
  ]);
  const targets = {
    calories: requirements.dailyCalories,
    protein: requirements.protein,
    carbohydrates: requirements.carbohydrates,
    fat: requirements.fat,
    fiber: DAILY_FIBER_TARGET_GRAMS,
  };
  const consumed = {
    calories: intake.calories,
    protein: intake.protein,
    carbohydrates: intake.carbohydrates,
    fat: intake.fat,
    fiber: intake.fiber,
  };
  const goal = profileResult.profile?.fitnessGoal;

  if (!goal) {
    throw new AppError('fitness goal is required to calculate nutrition requirements', 422);
  }

  return {
    date,
    targets,
    consumed,
    remaining: {
      calories: round2(targets.calories - consumed.calories),
      protein: round2(targets.protein - consumed.protein),
      carbohydrates: round2(targets.carbohydrates - consumed.carbohydrates),
      fat: round2(targets.fat - consumed.fat),
      fiber: round2(targets.fiber - consumed.fiber),
    },
    percentConsumed: {
      calories: percentage(consumed.calories, targets.calories),
      protein: percentage(consumed.protein, targets.protein),
      carbohydrates: percentage(consumed.carbohydrates, targets.carbohydrates),
      fat: percentage(consumed.fat, targets.fat),
      fiber: percentage(consumed.fiber, targets.fiber),
    },
    mealBreakdown: buildMealBreakdown(foods),
    foods: buildFoodBreakdown(foods),
    goalProgress: {
      goal,
      calorieStatus: getProgressStatus(consumed.calories, targets.calories),
      proteinStatus: getProgressStatus(consumed.protein, targets.protein),
    },
  };
};

const getPeriodDays = (from: string, to: string) => {
  const start = parseDateOnly(from, 'from');
  const end = parseDateOnly(to, 'to');

  if (start > end) {
    throw new AppError('from must be on or before to', 400);
  }

  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;

  if (days > 31) {
    throw new AppError('Analysis period cannot exceed 31 days', 400);
  }

  return days;
};

export const getPeriodNutritionAnalysis = async (
  userId: string,
  from: string,
  to: string,
) => {
  const days = getPeriodDays(from, to);
  const [, foods] = await Promise.all([
    getNutritionRequirements(userId),
    getFoodLogsForRange(userId, from, to),
  ]);
  const byDate = new Map<string, FoodLogData[]>();

  for (const food of foods) {
    const date = food.consumedAt.toISOString().slice(0, 10);
    const current = byDate.get(date) ?? [];
    current.push(food);
    byDate.set(date, current);
  }

  const dailyIntakes = [...byDate.entries()].map(([date, entries]) =>
    summarizeFoodLogs(date, entries),
  );
  const total = {
    calories: round2(dailyIntakes.reduce((sum, day) => sum + day.calories, 0)),
    protein: round2(dailyIntakes.reduce((sum, day) => sum + day.protein, 0)),
    carbohydrates: round2(
      dailyIntakes.reduce((sum, day) => sum + day.carbohydrates, 0),
    ),
    fat: round2(dailyIntakes.reduce((sum, day) => sum + day.fat, 0)),
    fiber: round2(dailyIntakes.reduce((sum, day) => sum + day.fiber, 0)),
  };
  const loggedDays = dailyIntakes.length;
  const average = (value: number): number =>
    loggedDays === 0 ? 0 : round2(value / loggedDays);

  return {
    from,
    to,
    days,
    dailyAverage: {
      calories: average(total.calories),
      protein: average(total.protein),
      carbohydrates: average(total.carbohydrates),
      fat: average(total.fat),
      fiber: average(total.fiber),
    },
    total,
    loggedDays,
  };
};

