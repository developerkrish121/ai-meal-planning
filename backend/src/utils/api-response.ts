import type { Response } from 'express';

import type { ErrorResponse } from '../types/api.js';

export const sendSuccess = <T>(
  response: Response,
  statusCode: number,
  data: T,
): Response<{ success: true; data: T }> =>
  response.status(statusCode).json({ success: true, data });

export const sendError = (
  response: Response,
  statusCode: number,
  message: string,
): Response<ErrorResponse> =>
  response.status(statusCode).json({ success: false, message });
