import { Redis } from "ioredis";
import dotenv from "dotenv";
dotenv.config();

const redis = new Redis(process.env.REDIS_URL!);

redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("error", (err) => console.log("❌ Redis error:", err));
redis.on("close", () => console.log("🔌 Redis disconnected.."));

const shutdownRedis = async () => {
  await redis.quit();
  process.exit(0);
};

process.on("SIGTERM", shutdownRedis);
process.on("SIGINT", shutdownRedis);

export default redis;
