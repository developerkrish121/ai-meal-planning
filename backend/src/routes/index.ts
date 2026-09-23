import { Router } from 'express';

import { authRouter } from './auth.routes.js';
import { foodRouter } from './food.routes.js';
import { healthRouter } from './health.routes.js';
import { nutritionRouter } from './nutrition.routes.js';
import { profileRouter } from './profile.routes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/foods', foodRouter);
apiRouter.use('/health', healthRouter);
apiRouter.use('/nutrition', nutritionRouter);
apiRouter.use('/profile', profileRouter);
