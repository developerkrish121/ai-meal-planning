import type { Response } from 'express';

import type { ErrorResponse } from '../types/api.js';

export const sendError = (
  response: Response,
  statusCode: number,
  message: string,
): Response<ErrorResponse> =>
  response.status(statusCode).json({ success: false, message });

