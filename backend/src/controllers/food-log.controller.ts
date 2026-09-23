import type { RequestHandler } from 'express';

import {
  createFoodLog,
  deleteFoodLog,
  getDailyIntake,
  getFoodLogById,
  getTodaySummary,
  listFoodLogs,
  updateFoodLog,
} from '../services/food-log.service.js';
import type { FoodLogInput, FoodLogUpdateInput } from '../types/food-log.js';
import { sendSuccess } from '../utils/api-response.js';
import {
  createFoodLogSchema,
  foodLogIdSchema,
  foodLogListSchema,
  summaryQuerySchema,
  updateFoodLogSchema,
} from '../utils/food-log-validation.js';
import { parseInput } from '../utils/validation.js';

const parseId = (value: string | string[] | undefined): string =>
  parseInput(foodLogIdSchema, typeof value === 'string' ? value : '');

export const createLog: RequestHandler = async (request, response) => {
  const input = parseInput(createFoodLogSchema, request.body);
  const { consumedAt, ...fields } = input;
  const serviceInput: FoodLogInput = {
    ...fields,
    ...(consumedAt ? { consumedAt: new Date(consumedAt) } : {}),
  };
  const log = await createFoodLog(request.auth!.userId, serviceInput);

  sendSuccess(response, 201, log);
};

export const readLogs: RequestHandler = async (request, response) => {
  const filters = parseInput(foodLogListSchema, request.query);
  const result = await listFoodLogs(request.auth!.userId, filters);

  sendSuccess(response, 200, result);
};

export const readLogById: RequestHandler = async (request, response) => {
  const log = await getFoodLogById(request.auth!.userId, parseId(request.params.id));

  sendSuccess(response, 200, log);
};

export const updateLog: RequestHandler = async (request, response) => {
  const input = parseInput(updateFoodLogSchema, request.body);
  const { consumedAt, ...fields } = input;
  const serviceInput: FoodLogUpdateInput = {
    ...fields,
    ...(consumedAt ? { consumedAt: new Date(consumedAt) } : {}),
  };
  const log = await updateFoodLog(
    request.auth!.userId,
    parseId(request.params.id),
    serviceInput,
  );

  sendSuccess(response, 200, log);
};

export const removeLog: RequestHandler = async (request, response) => {
  const result = await deleteFoodLog(request.auth!.userId, parseId(request.params.id));

  sendSuccess(response, 200, result);
};

export const readDailySummary: RequestHandler = async (request, response) => {
  const { date } = parseInput(summaryQuerySchema, request.query);
  const summary = await getDailyIntake(request.auth!.userId, date);

  sendSuccess(response, 200, summary);
};

export const readTodaySummary: RequestHandler = async (request, response) => {
  const summary = await getTodaySummary(request.auth!.userId);

  sendSuccess(response, 200, summary);
};
