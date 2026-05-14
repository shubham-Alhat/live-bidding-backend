import type { Auction } from "../types/types.js";
import redis from "../redis/redis.js";

export const initAuctionInRedis = async (auction: Auction) => {
  // timer
  const startTimeMs = new Date(auction.startTime).getTime();
  const endTimeMs = startTimeMs + auction.auctionDuration * 1000;
  // remaining seconds
  // const remainingTime = Math.floor((endTimeMs - Date.now()) / 1000);

  const pipeline = redis.pipeline();

  // hash
  pipeline.hset(`auction:${auction.id}:state`, {
    auctionId: auction.id,
    status: "LIVE",
    startingPrice: auction.startingPrice,
    startTime: startTimeMs / 1000,
    endTime: endTimeMs / 1000,
  });

  // set for live auctions tracking
  pipeline.sadd("live:auctions", auction.id);

  // string - auction viewerCount
  // pipeline.set(`auction:${auction.id}:viewerCount`, 0);

  pipeline.expire(
    `auction:${auction.id}:state`,
    auction.auctionDuration + 7200,
  );

  // pipeline.expire(
  //   `auction:${auction.id}:viewerCount`,
  //   auction.auctionDuration + 7200,
  // );

  await pipeline.exec();
};
