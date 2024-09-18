import type { Request, Response, NextFunction } from "express";
import { ErrorResponse } from "../utils/response.js";

export function ErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(err);
  ErrorResponse(res, 500, err);
}
