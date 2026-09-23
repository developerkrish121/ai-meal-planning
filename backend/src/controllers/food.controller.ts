import type { RequestHandler } from 'express';

import { getFoodById, listFoods, searchFoods } from '../services/food.service.js';
import { sendSuccess } from '../utils/api-response.js';

const parsePaginationValue = (value: unknown, fallback: number): number => {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return Number.NaN;
  }

  return Number(value);
};

export const readFoods: RequestHandler = async (request, response) => {
  const page = parsePaginationValue(request.query.page, 1);
  const limit = parsePaginationValue(request.query.limit, 20);
  const result = await listFoods(page, limit);

  sendSuccess(response, 200, result);
};

export const searchFoodRecords: RequestHandler = async (request, response) => {
  const query = typeof request.query.q === 'string' ? request.query.q : '';
  const page = parsePaginationValue(request.query.page, 1);
  const limit = parsePaginationValue(request.query.limit, 20);
  const result = await searchFoods(query, page, limit);

  sendSuccess(response, 200, result);
};

export const readFoodById: RequestHandler = async (request, response) => {
  const id = typeof request.params.id === 'string' ? request.params.id : '';
  const food = await getFoodById(id);

  sendSuccess(response, 200, food);
};
