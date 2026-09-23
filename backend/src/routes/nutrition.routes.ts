import { Router } from 'express';

import { readNutritionRequirements } from '../controllers/nutrition.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const nutritionRouter = Router();

nutritionRouter.get('/requirements', authenticate, readNutritionRequirements);

