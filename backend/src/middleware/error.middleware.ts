import type { ErrorRequestHandler } from 'express';

import { sendError } from '../utils/api-response.js';
import { AppError } from '../utils/app-error.js';

export const errorHandler: ErrorRequestHandler = (
  error: Error,
  _request,
  response,
  _next,
) => {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const message = error instanceof AppError ? error.message : 'Something went wrong';

  sendError(response, statusCode, message);
};
