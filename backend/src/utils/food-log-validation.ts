import { z } from 'zod';

import { mealTypes } from '../types/food-log.js';
import { AppError } from './app-error.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isoDateTime = z.string().datetime({ offset: true });
const quantity = z.number().finite().positive().max(1000);

export const createFoodLogSchema = z
  .object({
    foodId: z.string().regex(UUID_PATTERN, 'Invalid food ID'),
    mealType: z.enum(mealTypes),
    quantity,
    consumedAt: isoDateTime.optional(),
  })
  .strict();

export const updateFoodLogSchema = createFoodLogSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one food log field is required',
  });

export const foodLogListSchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    date: z.string().regex(DATE_PATTERN, 'date must use YYYY-MM-DD').optional(),
    from: z.string().regex(DATE_PATTERN, 'from must use YYYY-MM-DD').optional(),
    to: z.string().regex(DATE_PATTERN, 'to must use YYYY-MM-DD').optional(),
    mealType: z.enum(mealTypes).optional(),
  })
  .strict();

export const summaryQuerySchema = z
  .object({ date: z.string().regex(DATE_PATTERN, 'date must use YYYY-MM-DD') })
  .strict();

export const foodLogIdSchema = z.string().regex(UUID_PATTERN, 'Invalid food log ID');

export const parseDateOnly = (value: string, field = 'date'): Date => {
  if (!DATE_PATTERN.test(value)) {
    throw new AppError(`${field} must use YYYY-MM-DD`, 400);
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new AppError(`${field} must be a valid calendar date`, 400);
  }

  return parsed;
};

export const getUtcDayRange = (date: string) => {
  const start = parseDateOnly(date);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
};
