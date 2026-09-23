import { Router } from 'express';

import { readProfile, updateProfile } from '../controllers/profile.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const profileRouter = Router();

profileRouter.use(authenticate);
profileRouter.get('/', readProfile);
profileRouter.put('/', updateProfile);

