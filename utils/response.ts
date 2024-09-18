import type { Response } from "express";

/**
 *
 * @param res
 * @param data
 * @param message
 * Success response handler
 */
export function response(
  res: Response,
  data: any,
  message: string = "Success"
) {
  return res.status(200).json({ success: true, message, data });
}

/**
 *
 * @param res
 * @param status
 * @param error
 * Error response handler
 */
export function ErrorResponse(res: Response, status: number, error: string) {
  return res.status(status).json({ success: false, error });
}
