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
