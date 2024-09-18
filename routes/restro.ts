import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { validate } from "../middlewares/validation.js";
import { restroSchema, type RestroSchema } from "../schema/restro.schema.js";
import { redisClient } from "../utils/redis-client.js";
import { v4 as uuid } from "uuid";
import { getRestroKeyById } from "../utils/keys.js";
import { response } from "../utils/response.js";

const router: Router = Router();

// router.get("/:restroId", async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const client = redisClient();
//     const restroKey = getRestroKeyById();

//     const result = (await client).hGetAll();
//   } catch (err) {
//     next(err);
//   }
// });

router.post(
  "/",
  validate(restroSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body as RestroSchema;
    try {
      const client = redisClient();
      const id = uuid(); //hash id for the hset
      const restroKey = getRestroKeyById(id);
      const result = (await client).hSet(restroKey, {
        id,
        name: body.name,
        location: body.location,
      });

      console.log(`Added data is ${result}`);

      return response(res, result, "Data added successfully");
    } catch (err) {
      next(err);
    }
  }
);

export default router;
