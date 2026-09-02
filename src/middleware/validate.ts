import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
        headers: req.headers,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const firstMessage = error.errors[0]?.message || 'Invalid request payload or parameters';
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: firstMessage,
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      return res.status(400).json({
        success: false,
        error: 'BAD_REQUEST',
        message: 'Malformed request',
      });
    }
  };
};
