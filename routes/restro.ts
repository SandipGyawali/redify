import { validate } from "../middlewares/validation.js";
import {
  restroDetails,
  restroSchema,
  type RestroDetails,
  type RestroSchema,
} from "../schema/restro.schema.js";
import { redisClient } from "../utils/redis-client.js";
import { v4 as uuid } from "uuid";
import {
  cuisineKey,
  cusinesKey,
  getRestroKeyById,
  getReviewDetailsKeyById,
  getReviewKeyById,
  getWeatherKeyById,
  indexKey,
  restroByRatingKey,
  restroCuisinesKeyById,
  restroDetailsKeyById,
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

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  const { page = 1, limit = 10 } = req.query;
  const start = (Number(page) - 1) * Number(limit);
  const end = start + Number(limit) - 1;
  try {
    const client = await redisClient();
    const restroIds = await client.zRange(restroByRatingKey, start, end, {
      REV: true,
    });

    const restros = await Promise.all(
      restroIds.map((restroId) => client.hGetAll(getRestroKeyById(restroId)))
    );

    return response(res, restros, "Fetch Successful");
  } catch (err) {
    next(err);
  }
});

router.post(
  "/",
  validate(restroSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body as RestroSchema;
    try {
      const client = await redisClient();
      const id = uuid(); //hash id for the hset
      const restroKey = getRestroKeyById(id);
      const result = await Promise.all([
        ...body.cuisines.map((cusine) =>
          Promise.all([
            client.sAdd(cusinesKey, cusine),
            client.sAdd(cuisineKey(cusine), id),
            client.sAdd(restroCuisinesKeyById(id), cusine),
          ])
        ),
        client.hSet(restroKey, {
          id,
          name: body.name,
          location: body.location,
        }),
        client.zAdd(restroByRatingKey, {
          score: 0,
          value: id,
        }),
      ]);

      return response(res, result, "Data added successfully");
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Redis search and query integration with seeded index
 */
router.get(
  "/search",
  async (req: Request, res: Response, next: NextFunction) => {
    const { q } = req.query; // /search?q=name

    try {
      const client = await redisClient();
      const results = await client.ft.search(indexKey, `@name:${q}`);

      return response(res, results);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * stores the restro details in redis-db using redis-json
 */
router.post(
  "/:restroId/details",
  restroExists,
  validate(restroDetails),
  async (
    req: Request<{ restroId: string }>,
    res: Response,
    next: NextFunction
  ) => {
    const { restroId } = req.params;
    const data = req.body as RestroDetails;
    try {
      const client = await redisClient();
      const restroDetails = restroDetailsKeyById(restroId);

      await client.json.set(restroDetails, ".", data);
      return response(res, {}, "Restro Details Added.");
    } catch (err) {
      next();
    }
  }
);

/**
 * get restro details from redis-json
 */
router.get(
  "/:restroId/details",
  restroExists,
  async (
    req: Request<{ restroId: string }>,
    res: Response,
    next: NextFunction
  ) => {
    const { restroId } = req.params;
    try {
      const client = await redisClient();
      const restroDetailsKey = restroDetailsKeyById(restroId);

      const data = await client.json.get(restroDetailsKey);
      return response(res, data);
    } catch (err) {
      next();
    }
  }
);

/**
 * get weather info based on the location using third party service
 * Cache-hit and Cache-miss strategy
 */
router.get(
  "/:restroId/weather",
  restroExists,
  async (
    req: Request<{ restroId: string }>,
    res: Response,
    next: NextFunction
  ) => {
    const { restroId } = req.params;
    try {
      const client = await redisClient();
      const weatherKey = getWeatherKeyById(restroId);
      const restroKey = getRestroKeyById(restroId);
      const coordinates = await client.hGet(restroKey, "location");

      const cachedWeatherData = await client.get(weatherKey);
      if (cachedWeatherData) {
        console.log("Cache hit");
        return response(res, JSON.parse(cachedWeatherData));
      }

      if (!coordinates)
        return ErrorResponse(res, 404, "Coordinates is not found");
      const [lat, lng] = coordinates.split(",");

      const apiResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?units=imperial&lat=${lat}&lon=${lng}&appid=${process.env.WEATHER_API_KEY}`
      );

      console.log(await apiResponse.json());
      if (apiResponse.status === 200) {
        const json = await apiResponse.json();
        await client.set(weatherKey, JSON.stringify(json), {
          EX: 60 * 60,
        });
        return response(res, json);
      }

      return ErrorResponse(res, 500, "Couldn't fetch weather info");
    } catch (err) {
      console.log(err);
      next();
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

      const [reviewCount, setResult, totalStars] = await Promise.all([
        client.lPush(reviewKey, reviewId),
        client.hSet(reviewDetailKey, reviewData),
        client.hIncrByFloat(
          getRestroKeyById(restroId),
          "totalStars",
          data.rating
        ),
      ]);

      const averageRating = Number((totalStars / reviewCount).toFixed(1));
      await Promise.all([
        client.zAdd(getReviewDetailsKeyById(restroId), {
          score: averageRating,
          value: restroId,
        }),
        client.hSet(getRestroKeyById(restroId), "avgStart", averageRating),
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
      const [viewCount, restro, cuisines] = await Promise.all([
        client.hIncrBy(restroKey, "viewCount", 1), //increment the viewCount based on the request count hit.
        client.hGetAll(restroKey),
        client.sMembers(restroCuisinesKeyById(restroId)),
      ]);

      return response(res, restro);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
