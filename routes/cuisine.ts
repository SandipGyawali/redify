import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { redisClient } from "../utils/redis-client.js";
import { cuisineKey, cusinesKey, getRestroKeyById } from "../utils/keys.js";
import { response } from "../utils/response.js";

const router: Router = Router();

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const client = await redisClient();
    const cuisines = await client.sMembers(cusinesKey);

    return response(res, cuisines);
  } catch (err) {
    next(err);
  }
});

router.get(
  "/:cuisine",
  async (
    req: Request<{ cuisine: string }>,
    res: Response,
    next: NextFunction
  ) => {
    const { cuisine } = req.params;
    try {
      const client = await redisClient();
      const restroId = await client.sMembers(cuisineKey(cuisine));
      const restros = await Promise.all(
        restroId.map((id) => client.hGet(getRestroKeyById(id), "name"))
      );

      return response(res, restros);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
