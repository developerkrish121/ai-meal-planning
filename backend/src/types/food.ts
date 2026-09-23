export interface FoodNutritionInput {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
}

export interface FoodInput {
  name: string;
  category: string;
  servingSize: number;
  nutrition: FoodNutritionInput;
}

export interface FoodData extends FoodNutritionInput {
  id: string;
  name: string;
  category: string;
  servingSize: number;
}

export interface PaginatedFoods {
  items: FoodData[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

