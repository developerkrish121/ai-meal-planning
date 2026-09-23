import { z } from 'zod';

export const foodInputSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    category: z.string().trim().min(1).max(100),
    servingSize: z.number().positive().max(10_000),
    nutrition: z
      .object({
        calories: z.number().nonnegative(),
        protein: z.number().nonnegative(),
        carbohydrates: z.number().nonnegative(),
        fat: z.number().nonnegative(),
        fiber: z.number().nonnegative(),
      })
      .strict(),
  })
  .strict();

