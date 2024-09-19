import { validate } from "../middlewares/validation.js";
import { restroSchema, type RestroSchema } from "../schema/restro.schema.js";
import { redisClient } from "../utils/redis-client.js";
import { v4 as uuid } from "uuid";
import {
  getRestroKeyById,
  getReviewDetailsKeyById,
  getReviewKeyById,
} from "../utils/keys.js";
import { ErrorResponse, response } from "../utils/response.js";
import { restroExists } from "../middlewares/restro-check.js";
import { reviewSchema, type ReviewSchema } from "../schema/review.js";
import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";

const router: Router = Router();

// router.get("/", async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const client = redisClient();
//     const id = getRestroKey();
//     const result = await (await client).hGetAll(id);

//     console.log(result);
//     return response(res, result, "Fetch Successful");
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

      return response(res, result, "Data added successfully");
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Post reviews of restro based on restroId as param
 */
router.post(
  "/:restroId/reviews",
  restroExists,
  validate(reviewSchema),
  async (
    req: Request<{ restroId: string }>,
    res: Response,
    next: NextFunction
  ) => {
    const { restroId } = req.params;
    const data = req.body as ReviewSchema;

    try {
      const client = await redisClient();
      const reviewId = uuid();
      const reviewKey = getReviewKeyById(restroId); //key that is binded with the restro id
      const reviewDetailKey = getReviewDetailsKeyById(reviewId); //key for the review hash table data that is to be stored

      const reviewData = {
        id: reviewId,
        ...data,
        timestamp: Date.now(),
        restroId, //reference to restroId of which the review is written of.
      };

      await Promise.all([
        client.lPush(reviewKey, reviewId),
        client.hSet(reviewDetailKey, reviewData),
      ]);

      return response(res, reviewData, "Review added");
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Get all the review based on the restro id
 */
router.get(
  "/:restroId/reviews",
  restroExists,
  async (
    req: Request<{ restroId: string }>,
    res: Response,
    next: NextFunction
  ) => {
    const { restroId } = req.params;
    // pagination query
    const { page = 1, limit = 10 } = req.query; //api?page=number&limit=number
    const start = (Number(page) - 1) * Number(limit);
    const end = start + Number(limit) - 1;

    try {
      const client = await redisClient();
      const reviewKey = getReviewKeyById(restroId);
      const reviewIds = await client.lRange(reviewKey, start, end); //get's the review id's on pagination

      const reviews = await Promise.all(
        reviewIds.map((review) =>
          client.hGetAll(getReviewDetailsKeyById(review))
        )
      );

      return response(res, reviews, "Reviews fetched successfully");
    } catch (err) {
      next();
    }
  }
);

router.delete(
  "/:restroId/reviews/:reviewId",
  restroExists,
  async (
    req: Request<{ restroId: string; reviewId: string }>,
    res: Response,
    next: NextFunction
  ) => {
    const { restroId, reviewId } = req.params;

    try {
      const client = await redisClient();

      const reviewKey = getReviewKeyById(restroId);
      const reviewDetailKey = getReviewDetailsKeyById(reviewId);

      const [removeResult, deleteResult] = await Promise.all([
        client.lRem(reviewKey, 0, reviewId), //remove from list
        client.del(reviewDetailKey), //remove from the hash
      ]);

      if (removeResult === 0 && deleteResult === 0) {
        return ErrorResponse(res, 404, "Review not found");
      }

      return response(res, 200, "Review delete successfully");
    } catch (err) {
      next();
    }
  }
);

router.get(
  "/:restroId",
  restroExists,
  async (
    req: Request<{ restroId: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { restroId } = req.params;
      const client = await redisClient(); //redis client instance
      const restroKey = await getRestroKeyById(restroId);
      await Promise.all([
        client.hIncrBy(restroKey, "viewCount", 1), //increment the viewCount based on the request count hit.
        client.hGetAll(restroKey),
      ]);
      const data = await client.hGetAll(restroKey);

      return response(res, data);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
