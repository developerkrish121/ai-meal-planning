import type { RequestHandler } from 'express';

import {
  getDailyNutritionAnalysis,
  getPeriodNutritionAnalysis,
} from '../services/nutrition-analysis.service.js';
import { sendSuccess } from '../utils/api-response.js';
import {
  dailyAnalysisQuerySchema,
  periodAnalysisQuerySchema,
} from '../utils/nutrition-analysis-validation.js';
import { parseInput } from '../utils/validation.js';

export const readDailyAnalysis: RequestHandler = async (request, response) => {
  const { date } = parseInput(dailyAnalysisQuerySchema, request.query);
  const analysis = await getDailyNutritionAnalysis(request.auth!.userId, date);

  sendSuccess(response, 200, analysis);
};

export const readPeriodAnalysis: RequestHandler = async (request, response) => {
  const { from, to } = parseInput(periodAnalysisQuerySchema, request.query);
  const analysis = await getPeriodNutritionAnalysis(request.auth!.userId, from, to);

  sendSuccess(response, 200, analysis);
};

