import type { NextFunction, Request, Response } from 'express';
import { ApiError } from './error.js';

export function requireAdmin(request: Request, _response: Response, next: NextFunction) {
  const configuredKey = process.env.ADMIN_API_KEY;
  const suppliedKey = request.header('x-admin-key');
  if (!configuredKey || !suppliedKey || suppliedKey !== configuredKey) {
    next(new ApiError(401, 'Admin authentication is required.', 'ADMIN_UNAUTHORIZED'));
    return;
  }
  next();
}