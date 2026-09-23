import type { RequestHandler } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';

import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';

export const authenticate: RequestHandler = (request, _response, next) => {
  const authorization = request.header('authorization');

  if (!authorization?.startsWith('Bearer ')) {
    next(new AppError('Authentication required', 401));
    return;
  }

  const token = authorization.slice('Bearer '.length).trim();

  if (!token) {
    next(new AppError('Authentication required', 401));
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    if (typeof payload.sub !== 'string' || !payload.sub) {
      throw new Error('Token subject is missing');
    }

    request.auth = { userId: payload.sub };
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401));
  }
};

