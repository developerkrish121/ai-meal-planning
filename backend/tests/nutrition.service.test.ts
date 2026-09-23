import { describe, expect, it } from 'vitest';

import type { NutritionCalculationInput } from '../src/types/nutrition.js';
import { AppError } from '../src/utils/app-error.js';
import { calculateNutritionRequirements } from '../src/services/nutrition.service.js';

const baseInput: NutritionCalculationInput = {
  age: 30,
  gender: 'male',
  heightCm: 180,
  weightKg: 80,
  activityLevel: 'moderate',
  fitnessGoal: 'maintenance',
};

describe('nutrition calculation service', () => {
  it('calculates male BMR using Mifflin-St Jeor', () => {
    expect(calculateNutritionRequirements(baseInput).bmr).toBe(1780);
  });

  it('calculates female BMR using Mifflin-St Jeor', () => {
    expect(
      calculateNutritionRequirements({ ...baseInput, gender: 'female' }).bmr,
    ).toBe(1614);
  });

  it.each([
    ['sedentary', 2136],
    ['light', 2448],
    ['moderate', 2759],
    ['very_active', 3071],
    ['extra_active', 3382],
  ] as const)('applies the %s activity multiplier', (activityLevel, expectedTdee) => {
    expect(calculateNutritionRequirements({ ...baseInput, activityLevel }).tdee).toBe(
      expectedTdee,
    );
  });

  it.each([
    ['maintenance', 2759],
    ['weight_loss', 2259],
    ['weight_gain', 3059],
    ['muscle_gain', 3059],
  ] as const)('applies the %s calorie adjustment', (fitnessGoal, dailyCalories) => {
    expect(calculateNutritionRequirements({ ...baseInput, fitnessGoal }).dailyCalories).toBe(
      dailyCalories,
    );
  });

  it.each([
    ['maintenance', 128],
    ['weight_loss', 144],
    ['weight_gain', 160],
    ['muscle_gain', 160],
  ] as const)('calculates the %s protein target', (fitnessGoal, protein) => {
    expect(calculateNutritionRequirements({ ...baseInput, fitnessGoal }).protein).toBe(protein);
  });

  it('allocates 25 percent of target calories to fat', () => {
    expect(calculateNutritionRequirements(baseInput).fat).toBe(77);
  });

  it('allocates remaining calories to carbohydrates', () => {
    expect(calculateNutritionRequirements(baseInput).carbohydrates).toBe(389);
  });

  it.each([
    [{ ...baseInput, age: 0 }, 'age must be between'],
    [{ ...baseInput, heightCm: 500 }, 'height must be between'],
    [{ ...baseInput, weightKg: -1 }, 'weight must be between'],
    [{ ...baseInput, gender: 'other' as 'male' }, 'Unsupported gender'],
    [{ ...baseInput, activityLevel: 'unknown' as 'moderate' }, 'Unsupported activity level'],
    [{ ...baseInput, fitnessGoal: 'unknown' as 'maintenance' }, 'Unsupported fitness goal'],
  ])('rejects invalid input', (input, expectedMessage) => {
    expect(() => calculateNutritionRequirements(input)).toThrowError(AppError);
    expect(() => calculateNutritionRequirements(input)).toThrowError(expectedMessage);
  });
});

