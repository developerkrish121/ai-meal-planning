export const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export type ApiMealType = (typeof mealTypes)[number];

export interface FoodLogInput {
  foodId: string;
  mealType: ApiMealType;
  quantity: number;
  consumedAt?: Date;
}

export interface FoodLogUpdateInput {
  foodId?: string;
  mealType?: ApiMealType;
  quantity?: number;
  consumedAt?: Date;
}

export interface FoodLogFilters {
  page: number;
  limit: number;
  date?: string;
  from?: string;
  to?: string;
  mealType?: ApiMealType;
}

export interface FoodLogData {
  id: string;
  foodId: string;
  foodName: string;
  category: string;
  servingSize: number;
  quantity: number;
  mealType: ApiMealType;
  consumedAt: Date;
  createdAt: Date;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
}
