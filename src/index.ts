import dotenv from "dotenv";
dotenv.config();
import { bootstrap } from "./lib/bootstrap.js";
import redis from "./websocket/redis/redis.js";
import { prisma } from "./db/prisma.js";
import {
  queueConnection,
  workerConnection,
} from "./websocket/workers/connection.js";
import server from "./app.js";

const PORT = process.env.PORT || 8000;

const startServer = async () => {
  try {
    const workers = await bootstrap();

    const shutdown = async () => {
      await redis.quit();
      await prisma.$disconnect();
      await workers.auctionWorker.close();
      await workers.bidSyncWorker.close();
      await queueConnection.quit();
      await workerConnection.quit();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    server.listen(PORT, () => {
      console.log("🖥 Server started..");
    });
  } catch (error) {
    console.log("critical error while server startup", error);
    process.exit(1);
  }
};

startServer();
