import { Queue } from "bullmq";
import { queueConnection } from "./connection.js";

const auctionQueue = new Queue("auction", {
  connection: queueConnection,
  defaultJobOptions: { removeOnComplete: true, removeOnFail: true },
});

export const scheduleAuctionEnd = async (
  auctionId: string,
  durationMs: number,
) => {
  await auctionQueue.add(
    "end-auction",
    { auctionId },
    {
      delay: durationMs,
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
    },
  );
  console.log(`⏱ auction: ${auctionId} timer started..`);
};
