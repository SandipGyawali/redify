import { createClient, type RedisClientType } from "redis";

let client: RedisClientType | null = null;

/**
 *
 * Method that returns the singleton redis client instance/
 * @returns redis-client
 */
const redisClient = async (): Promise<RedisClientType> => {
  if (!client) {
    /**
     * Redis client options
     */
    const options = {
      url: "redis://localhost:6379",
    };

    client = createClient(options);
    client?.on("error", (error) => {
      console.error(error);
    });

    client?.on("connect", () => {
      console.log("Redis connected");
    });

    await client?.connect();
  }

  return client;
};

export { redisClient };
