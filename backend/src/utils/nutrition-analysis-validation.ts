import { z } from 'zod';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const dailyAnalysisQuerySchema = z
  .object({ date: z.string().regex(DATE_PATTERN, 'date must use YYYY-MM-DD') })
  .strict();

export const periodAnalysisQuerySchema = z
  .object({
    from: z.string().regex(DATE_PATTERN, 'from must use YYYY-MM-DD'),
    to: z.string().regex(DATE_PATTERN, 'to must use YYYY-MM-DD'),
  })
  .strict();

