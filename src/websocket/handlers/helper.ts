import type { Auction, BidResult } from "../types/types.js";
import redis from "../redis/redis.js";
import { scheduleAuctionEnd } from "../workers/auctionQueue.js";

export const initAuctionInRedis = async (auction: Auction) => {
  // timer
  const startTimeMs = new Date(auction.startTime).getTime();
  const endTimeMs = startTimeMs + auction.auctionDuration * 1000;
  // remaining seconds
  const durationMs = Math.floor(endTimeMs - Date.now());

  // start server timer - bullmq delay jobs
  await scheduleAuctionEnd(auction.id, durationMs);

  const pipeline = redis.pipeline();

  // hash
  pipeline.hset(`auction:${auction.id}:state`, {
    auctionId: auction.id,
    status: "active",
    startingPrice: auction.startingPrice,
    startTime: startTimeMs,
    endTime: endTimeMs,
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

export const getParticipantsList = async (auctionId: string) => {
  const flat = (await redis.zrevrange(
    `auction:${auctionId}:bidders`,
    0,
    -1,
    "WITHSCORES",
  )) as string[];

  // flat array into pairs [{ userId, joinedAt }]
  const entries: { userId: string; joinedAt: number }[] = [];
  for (let i = 0; i < flat.length; i += 2) {
    const userId = flat[i];
    const score = flat[i + 1];

    if (!userId || !score) continue;

    entries.push({
      userId,
      joinedAt: Number(score),
    });
  }

  if (entries.length === 0) return [];

  //  fetch all usernames
  const userKeys = entries.map((e) => `user:${e.userId}:username`);
  const usernames = await redis.mget(...userKeys);

  return entries.map((entry, i) => ({
    userId: entry.userId,
    username: usernames[i] ?? "Unknown",
    joinedAt: entry.joinedAt,
  }));
};

export const parseLuaResult = (raw: unknown): BidResult => {
  const res = raw as (string | number)[];

  if (res[0] === 0 || res[0] === "0") {
    const reason = res[1] as string;

    if (reason === "AUCTION_NOT_FOUND") {
      return { success: false, reason: "AUCTION_NOT_FOUND" };
    }

    if (reason === "AUCTION_ENDED") {
      return { success: false, reason: "AUCTION_ENDED" };
    }

    if (reason === "BID_TOO_LOW") {
      return {
        success: false,
        reason: "BID_TOO_LOW",
        currentHighestBid: Number(res[2]),
        nextMinBid: Number(res[3]),
      };
    }
  }

  // success
  return {
    success: true,
    bidAmount: Number(res[1]),
    nextMinBid: Number(res[2]),
    bidCount: Number(res[3]),
  };
};
