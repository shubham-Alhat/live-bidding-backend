import { Job, Worker } from "bullmq";
import { workerConnection } from "./connection.js";
import redis from "../redis/redis.js";
import { auctionRoomManager } from "../auctionRoomManager.js";
import { prisma } from "../../db/prisma.js";
import { enqueueBidSync } from "./bidSyncQueue.js";

export const startAuctionWorker = () => {
  const auctionWorker = new Worker(
    "auction",
    async (job: Job) => {
      const { auctionId } = job.data;
      const pipeline = redis.pipeline();
      pipeline.hset(`auction:${auctionId}:state`, "status", "ended");
      pipeline.zrevrange(`auction:${auctionId}:bids`, 0, 0, "WITHSCORES");
      const result = await pipeline.exec();
      if (!result) throw new Error("Pipeline returned null");

      const topBid = (result[1]?.[1] ?? []) as string[] | [];
      let currentHighestBidAmount = 0;
      let currentHighestBidder = null;

      if (topBid.length > 0 && topBid[0]) {
        currentHighestBidAmount = Number(topBid[1]);
        // extract userId from "userId:uuid"
        const actualUserId = topBid[0].split(":")[0];
        currentHighestBidder = await redis.get(`user:${actualUserId}:username`);
      }

      const rawData = {
        type: "auction_ended",
        payload: {
          currentHighestBidAmount: currentHighestBidAmount,
          currentHighestBidder: currentHighestBidder,
        },
      };

      // broadcast in auction room
      auctionRoomManager.broadcastInAuction(auctionId, rawData);

      //   update in db
      await prisma.auction.update({
        where: {
          id: auctionId,
        },
        data: {
          status: "ENDED",
        },
      });

      // start bid-sync worker
      await enqueueBidSync(auctionId);
      console.log(
        `[AuctionWorker] Auction ${auctionId} ended, bid sync started..`,
      );
    },
    { connection: workerConnection, concurrency: 3 },
  );

  // event listeners
  auctionWorker.on("completed", (job) => {
    console.log(`[AuctionWorker] Job ${job.id} completed`);
  });

  auctionWorker.on("failed", (job, err) => {
    console.error(`[AuctionWorker] Job ${job?.id} failed:`, err.message);
  });

  return auctionWorker;
};
