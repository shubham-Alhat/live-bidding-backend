import { Job, Worker } from "bullmq";
import { workerConnection } from "./connection.js";
import redis from "../redis/redis.js";
import { prisma } from "../../db/prisma.js";

export const startBidSyncWorker = (): Worker => {
  const bidSyncWorker = new Worker(
    "bid-sync",
    async (job: Job) => {
      const { auctionId } = job.data;

      const rawBids = await redis.zrange(
        `auction:${auctionId}:bids`,
        0,
        -1,
        "WITHSCORES",
      );

      if (rawBids.length === 0) {
        console.log(`[BidSyncWorker] No bids to sync for ${auctionId}`);
        return;
      }

      const bids: {
        id: string;
        auctionId: string;
        price: number;
        bidderId: string;
      }[] = [];
      for (let i = 0; i < rawBids.length; i += 2) {
        const member = rawBids[i];
        const score = rawBids[i + 1];

        if (!member || !score) continue;

        const [bidderId, bidId] = member.split(":");
        if (!bidderId || !bidId) continue;

        bids.push({
          id: bidId,
          auctionId: auctionId,
          price: Number(score),
          bidderId: bidderId,
        });
      }

      // entry in db
      const result = await prisma.bid.createMany({
        data: bids,
        skipDuplicates: true,
      });

      console.log("_____________________________________");
      console.log(`[BidSyncWorker] Synced bids for auction ${auctionId}`);
      console.log(`Redis bids:`, bids.length);
      console.log(`DB bids:`, result.count);

      // delete from redis.
    },
    { connection: workerConnection, concurrency: 1 },
  );

  bidSyncWorker.on("completed", (job) => {
    console.log(`[BidSyncWorker] Job ${job.id} completed`);
  });

  bidSyncWorker.on("failed", (job, err) => {
    console.error(`[BidSyncWorker] Job ${job?.id} failed:`, err.message);
  });

  return bidSyncWorker;
};
