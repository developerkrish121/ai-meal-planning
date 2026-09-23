import { Router } from 'express';

import {
  readDailyAnalysis,
  readPeriodAnalysis,
} from '../controllers/nutrition-analysis.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const nutritionAnalysisRouter = Router();

nutritionAnalysisRouter.use(authenticate);
nutritionAnalysisRouter.get('/period', readPeriodAnalysis);
nutritionAnalysisRouter.get('/', readDailyAnalysis);

