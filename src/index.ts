import server from "./app.js";
import { prisma } from "./db/prisma.js";
import { loadScript } from "./websocket/redis/bidScript.js";
import redis from "./websocket/redis/redis.js";
import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 8000;

const startServer = async () => {
  try {
    await loadScript();

    server.listen(PORT, () => {
      console.log(`Server started...`);
    });
  } catch (error) {
    console.log("critical error while server startup", error);
    process.exit(1);
  }
};

const shutdown = async () => {
  await redis.quit();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startServer();
