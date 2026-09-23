import { Router } from 'express';

import { readNutritionRequirements } from '../controllers/nutrition.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { nutritionAnalysisRouter } from './nutrition-analysis.routes.js';

export const nutritionRouter = Router();

nutritionRouter.use('/analysis', nutritionAnalysisRouter);
nutritionRouter.get('/requirements', authenticate, readNutritionRequirements);
