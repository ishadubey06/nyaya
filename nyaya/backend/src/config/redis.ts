import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL;

const redisClient = createClient({
  url: redisUrl,
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));

let isConnected = false;

export const connectRedis = async () => {
  if (!isConnected && redisUrl) {
    try {
      await redisClient.connect();
      isConnected = true;
      console.log("Connected to Redis");
    } catch (err) {
      console.error("Failed to connect to Redis", err);
    }
  }
};

export default redisClient;
