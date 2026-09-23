import type {
  ActivityLevel,
  FitnessGoal,
  NutritionGender,
} from '../config/nutrition.constants.js';

export interface NutritionCalculationInput {
  age: number;
  gender: NutritionGender;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  fitnessGoal: FitnessGoal;
}

export interface NutritionRequirements {
  bmr: number;
  tdee: number;
  dailyCalories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
}

