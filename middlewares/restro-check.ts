import type { NextFunction, Request, Response } from "express";
import { ErrorResponse } from "../utils/response.js";
import { redisClient } from "../utils/redis-client.js";
import { getRestroKeyById } from "../utils/keys.js";

/**
 *
 * @param req
 * @param res
 * @param next
 * -> Checks if the provided restroId exists in the redis hashSet or not
 */
export const restroExists = async (
  req: Request<{ restroId: string }>,
  res: Response,
  next: NextFunction
) => {
  const { restroId } = req.params;

  if (!restroId) return ErrorResponse(res, 400, "Restro id not provided");

  const client = await redisClient();
  const restroKey = await getRestroKeyById(restroId);
  const exists = await client.exists(restroKey);

  if (!exists) return ErrorResponse(res, 404, "Restro not found in redis-db");

  next();
};
