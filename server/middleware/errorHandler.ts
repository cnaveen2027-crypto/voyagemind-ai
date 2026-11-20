import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../services/geminiClient';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: err.message,
      code: err.code,
    });
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  console.error('[VoyageMind API Error]', err);
  return res.status(500).json({
    error: message,
    code: 'INTERNAL_SERVER_ERROR',
  });
}
