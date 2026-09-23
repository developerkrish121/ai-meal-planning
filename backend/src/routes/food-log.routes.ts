import { Router } from 'express';

import {
  createLog,
  readDailySummary,
  readLogById,
  readLogs,
  readTodaySummary,
  removeLog,
  updateLog,
} from '../controllers/food-log.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const foodLogRouter = Router();

foodLogRouter.use(authenticate);
foodLogRouter.get('/summary/today', readTodaySummary);
foodLogRouter.get('/summary', readDailySummary);
foodLogRouter.post('/', createLog);
foodLogRouter.get('/', readLogs);
foodLogRouter.get('/:id', readLogById);
foodLogRouter.put('/:id', updateLog);
foodLogRouter.delete('/:id', removeLog);

