import { Queue } from "bullmq";
import { queueConnection } from "./connection.js";

const bidSyncQueue = new Queue("bid-sync", {
  connection: queueConnection,
  defaultJobOptions: { removeOnComplete: true, removeOnFail: 3 },
});

export const enqueueBidSync = async (auctionId: string) => {
  await bidSyncQueue.add(
    "sync-bids",
    { auctionId },
    { attempts: 3, backoff: { type: "exponential", delay: 2000 } },
  );
};
