import { Router } from 'express';

import {
  readFoodById,
  readFoods,
  searchFoodRecords,
} from '../controllers/food.controller.js';

export const foodRouter = Router();

foodRouter.get('/', readFoods);
foodRouter.get('/search', searchFoodRecords);
foodRouter.get('/:id', readFoodById);

