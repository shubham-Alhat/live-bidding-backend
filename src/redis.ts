import { Redis } from "ioredis";
import dotenv from "dotenv";
dotenv.config();

const redis = new Redis(process.env.REDIS_URL as string);
async function main() {
  await redis.set("swayam", "billionaire");
  const val = await redis.get("shubham");
  console.log(val);
}

main();
