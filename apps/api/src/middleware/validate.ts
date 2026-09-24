import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { badRequest } from '../core/errors';

/** Validates req.body (replacing it with the parsed value) or req.query (stored in res.locals.query). */
export function validate(schema: ZodTypeAny, source: 'body' | 'query' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(source === 'body' ? req.body : req.query);
    if (!result.success) return next(badRequest('Validation failed', result.error.flatten()));
    if (source === 'body') req.body = result.data;
    else res.locals.query = result.data;
    next();
  };
}
