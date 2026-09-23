import type { RequestHandler } from 'express';

import { getNutritionRequirements } from '../services/nutrition.service.js';
import { sendSuccess } from '../utils/api-response.js';

export const readNutritionRequirements: RequestHandler = async (request, response) => {
  const requirements = await getNutritionRequirements(request.auth!.userId);

  sendSuccess(response, 200, requirements);
};

