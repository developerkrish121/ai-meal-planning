import type { RequestHandler } from 'express';

import { loginUser, registerUser } from '../services/auth.service.js';
import { sendSuccess } from '../utils/api-response.js';
import { credentialsSchema, parseInput } from '../utils/validation.js';

export const register: RequestHandler = async (request, response) => {
  const credentials = parseInput(credentialsSchema, request.body);
  const user = await registerUser(credentials);

  sendSuccess(response, 201, { user });
};

export const login: RequestHandler = async (request, response) => {
  const credentials = parseInput(credentialsSchema, request.body);
  const result = await loginUser(credentials);

  sendSuccess(response, 200, result);
};

