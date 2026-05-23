import server from "./app.js";
import { prisma } from "./db/prisma.js";
import { loadScript } from "./websocket/redis/bidScript.js";
import redis from "./websocket/redis/redis.js";
import dotenv from "dotenv";
import {
  queueConnection,
  workerConnection,
} from "./websocket/workers/connection.js";
import { startAuctionWorker } from "./websocket/workers/auctionWorker.js";
import { startBidSyncWorker } from "./websocket/workers/bidSyncWorker.js";
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

// start workers
const auctionWorker = startAuctionWorker();
const bidSyncWorker = startBidSyncWorker();

const shutdown = async () => {
  await redis.quit();
  await prisma.$disconnect();
  await auctionWorker.close();
  await bidSyncWorker.close();
  await queueConnection.quit();
  await workerConnection.quit();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startServer();
