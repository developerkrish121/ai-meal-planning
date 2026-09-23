import type { UserProfile } from '@prisma/client';

import {
  ACTIVITY_LEVEL_ALIASES,
  ACTIVITY_MULTIPLIERS,
  CALORIES_PER_GRAM,
  FAT_CALORIE_RATIO,
  GOAL_CALORIE_ADJUSTMENTS,
  PROFILE_LIMITS,
  PROTEIN_GRAMS_PER_KG,
  type ActivityLevel,
  type FitnessGoal,
  type NutritionGender,
} from '../config/nutrition.constants.js';
import { prisma } from '../config/prisma.js';
import type {
  NutritionCalculationInput,
  NutritionRequirements,
} from '../types/nutrition.js';
import { AppError } from '../utils/app-error.js';

const round = (value: number): number => Math.round(value);

const requireNumberInRange = (
  value: number | null,
  field: string,
  min: number,
  max: number,
): number => {
  if (value === null || !Number.isFinite(value)) {
    throw new AppError(`${field} is required to calculate nutrition requirements`, 422);
  }

  if (value < min || value > max) {
    throw new AppError(`${field} must be between ${min} and ${max}`, 422);
  }

  return value;
};

const requireSupportedValue = <Value extends string>(
  value: string | null,
  field: string,
  supportedValues: readonly Value[],
): Value => {
  if (!value) {
    throw new AppError(`${field} is required to calculate nutrition requirements`, 422);
  }

  if (!supportedValues.includes(value as Value)) {
    throw new AppError(`Unsupported ${field}: ${value}`, 422);
  }

  return value as Value;
};

export const calculateNutritionRequirements = (
  input: NutritionCalculationInput,
): NutritionRequirements => {
  const age = requireNumberInRange(
    input.age,
    'age',
    PROFILE_LIMITS.age.min,
    PROFILE_LIMITS.age.max,
  );
  const heightCm = requireNumberInRange(
    input.heightCm,
    'height',
    PROFILE_LIMITS.heightCm.min,
    PROFILE_LIMITS.heightCm.max,
  );
  const weightKg = requireNumberInRange(
    input.weightKg,
    'weight',
    PROFILE_LIMITS.weightKg.min,
    PROFILE_LIMITS.weightKg.max,
  );
  const gender = requireSupportedValue<NutritionGender>(input.gender, 'gender', [
    'male',
    'female',
  ]);
  const activityLevel = requireSupportedValue<ActivityLevel>(
    input.activityLevel,
    'activity level',
    Object.keys(ACTIVITY_MULTIPLIERS) as ActivityLevel[],
  );
  const fitnessGoal = requireSupportedValue<FitnessGoal>(
    input.fitnessGoal,
    'fitness goal',
    Object.keys(GOAL_CALORIE_ADJUSTMENTS) as FitnessGoal[],
  );

  const genderAdjustment = gender === 'male' ? 5 : -161;
  const rawBmr = 10 * weightKg + 6.25 * heightCm - 5 * age + genderAdjustment;
  const rawTdee = rawBmr * ACTIVITY_MULTIPLIERS[activityLevel];
  const rawDailyCalories = rawTdee + GOAL_CALORIE_ADJUSTMENTS[fitnessGoal];

  if (rawDailyCalories <= 0) {
    throw new AppError('Calculated daily calories must be positive', 422);
  }

  const rawProtein = weightKg * PROTEIN_GRAMS_PER_KG[fitnessGoal];
  const rawFat = (rawDailyCalories * FAT_CALORIE_RATIO) / CALORIES_PER_GRAM.fat;
  const proteinCalories = rawProtein * CALORIES_PER_GRAM.protein;
  const fatCalories = rawFat * CALORIES_PER_GRAM.fat;
  const rawCarbohydrates = Math.max(
    0,
    (rawDailyCalories - proteinCalories - fatCalories) /
      CALORIES_PER_GRAM.carbohydrates,
  );

  return {
    bmr: round(rawBmr),
    tdee: round(rawTdee),
    dailyCalories: round(rawDailyCalories),
    protein: round(rawProtein),
    carbohydrates: round(rawCarbohydrates),
    fat: round(rawFat),
  };
};

const profileToCalculationInput = (profile: UserProfile): NutritionCalculationInput => {
  if (profile.age === null) {
    throw new AppError('age is required to calculate nutrition requirements', 422);
  }

  if (profile.height === null) {
    throw new AppError('height is required to calculate nutrition requirements', 422);
  }

  if (profile.weight === null) {
    throw new AppError('weight is required to calculate nutrition requirements', 422);
  }

  const gender = requireSupportedValue<NutritionGender>(profile.gender, 'gender', [
    'male',
    'female',
  ]);

  if (!profile.activityLevel) {
    throw new AppError('activity level is required to calculate nutrition requirements', 422);
  }

  const activityLevel = ACTIVITY_LEVEL_ALIASES[profile.activityLevel];

  if (!activityLevel) {
    throw new AppError(`Unsupported activity level: ${profile.activityLevel}`, 422);
  }

  const fitnessGoal = requireSupportedValue<FitnessGoal>(
    profile.fitnessGoal,
    'fitness goal',
    Object.keys(GOAL_CALORIE_ADJUSTMENTS) as FitnessGoal[],
  );

  return {
    age: profile.age,
    gender,
    heightCm: Number(profile.height),
    weightKg: Number(profile.weight),
    activityLevel,
    fitnessGoal,
  };
};

export const getNutritionRequirements = async (
  userId: string,
): Promise<NutritionRequirements> => {
  const profile = await prisma.userProfile.findUnique({ where: { userId } });

  if (!profile) {
    throw new AppError('A complete user profile is required', 422);
  }

  return calculateNutritionRequirements(profileToCalculationInput(profile));
};

