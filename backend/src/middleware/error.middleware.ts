import type { ErrorRequestHandler } from 'express';

import { env } from '../config/env.js';
import { sendError } from '../utils/api-response.js';

interface ErrorWithStatus extends Error {
  status?: number;
  statusCode?: number;
}

export const errorHandler: ErrorRequestHandler = (
  error: ErrorWithStatus,
  _request,
  response,
  _next,
) => {
  const candidateStatus = error.status ?? error.statusCode;
  const statusCode =
    typeof candidateStatus === 'number' && candidateStatus >= 400 && candidateStatus < 600
      ? candidateStatus
      : 500;
  const message =
    env.NODE_ENV === 'production' && statusCode === 500
      ? 'Something went wrong'
      : error.message || 'Something went wrong';

  sendError(response, statusCode, message);
};

