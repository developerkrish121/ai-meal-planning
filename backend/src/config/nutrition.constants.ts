export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
} as const;

export const ACTIVITY_LEVEL_ALIASES: Record<string, ActivityLevel> = {
  sedentary: 'sedentary',
  light: 'light',
  'lightly-active': 'light',
  moderate: 'moderate',
  'moderately-active': 'moderate',
  very_active: 'very_active',
  'very-active': 'very_active',
  extra_active: 'extra_active',
  'extra-active': 'extra_active',
};

export const GOAL_CALORIE_ADJUSTMENTS = {
  weight_loss: -500,
  weight_gain: 300,
  muscle_gain: 300,
  maintenance: 0,
} as const;

export const PROTEIN_GRAMS_PER_KG = {
  weight_loss: 1.8,
  weight_gain: 2,
  muscle_gain: 2,
  maintenance: 1.6,
} as const;

export const FAT_CALORIE_RATIO = 0.25;

export const CALORIES_PER_GRAM = {
  protein: 4,
  carbohydrates: 4,
  fat: 9,
} as const;

export const PROFILE_LIMITS = {
  age: { min: 13, max: 120 },
  heightCm: { min: 80, max: 250 },
  weightKg: { min: 20, max: 500 },
} as const;

export type ActivityLevel = keyof typeof ACTIVITY_MULTIPLIERS;
export type FitnessGoal = keyof typeof GOAL_CALORIE_ADJUSTMENTS;
export type NutritionGender = 'male' | 'female';

