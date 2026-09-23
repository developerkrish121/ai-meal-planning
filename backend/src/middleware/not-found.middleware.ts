import type { RequestHandler } from 'express';

import { sendError } from '../utils/api-response.js';

export const notFoundHandler: RequestHandler = (_request, response) => {
  sendError(response, 404, 'Route not found');
};

