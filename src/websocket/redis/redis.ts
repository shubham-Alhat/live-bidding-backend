import { Redis } from "ioredis";
import dotenv from "dotenv";
dotenv.config();

// const redis = new Redis(process.env.REDIS_URL!);

const redis = new Redis({
  host: process.env.REDIS_HOST!,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  // keepAlive: 10000, // send TCP keepalive every 10s
  // enableOfflineQueue: true, // queue commands during reconnect (already default)
});

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
