import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string
  ) {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const errorText = error instanceof Error ? error.message : String(error);
  if (errorText.includes("Can't reach database server") || errorText.includes('P1001') || errorText.includes('Environment variable not found: DATABASE_URL')) {
    response.status(503).json({
      success: false,
      error: { code: 'DATABASE_UNAVAILABLE', message: 'Booking data is temporarily unavailable. Please try again when the database is online.' }
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
        details: error.flatten()
      }
    });
    return;
  }

  if (error instanceof ApiError) {
    response.status(error.statusCode).json({
      success: false,
      error: { code: error.code, message: error.message }
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    success: false,
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' }
  });
};