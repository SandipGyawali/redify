import type { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

/**
 *
 * @param schema
 * <T> -> Generic infer type based on the request body
 * Zod input validation middleware.
 */
export const validate =
  <T>(schema: ZodSchema<T>) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(400)
        .json({ success: false, error: result.error.errors });
    }
    next();
  };
