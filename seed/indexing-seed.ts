import { SchemaFieldTypes } from "redis";
import { redisClient } from "../utils/redis-client.js";
import { indexKey, getKeyName } from "../utils/keys.js";

async function createIndex() {
  const client = await redisClient();

  try {
    await client.ft.dropIndex(indexKey);
  } catch (err) {
    console.error(err);
  }
  console.log("Worin");
  await client.ft.create(
    indexKey,
    {
      id: {
        type: SchemaFieldTypes.TEXT,
        AS: "id",
      },
      name: {
        type: SchemaFieldTypes.TEXT,
        AS: "name",
      },
      avgStars: {
        type: SchemaFieldTypes.NUMERIC,
        AS: "avgStars",
        SORTABLE: true,
      },
    },
    {
      ON: "HASH",
      PREFIX: getKeyName("restros"),
    }
  );

  console.log("worked");
}

await createIndex();
process.exit();
