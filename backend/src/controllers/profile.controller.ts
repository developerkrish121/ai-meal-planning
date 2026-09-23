import type { RequestHandler } from 'express';

import { getProfile, upsertProfile } from '../services/profile.service.js';
import { sendSuccess } from '../utils/api-response.js';
import { parseInput, profileSchema } from '../utils/validation.js';

export const readProfile: RequestHandler = async (request, response) => {
  const result = await getProfile(request.auth!.userId);

  sendSuccess(response, 200, result);
};

export const updateProfile: RequestHandler = async (request, response) => {
  const profileInput = parseInput(profileSchema, request.body);
  const profile = await upsertProfile(request.auth!.userId, profileInput);

  sendSuccess(response, 200, { profile });
};
