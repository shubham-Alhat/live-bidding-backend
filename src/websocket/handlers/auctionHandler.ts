import WebSocket from "ws";
import redis from "../redis/redis.js";
import { auctionRoomManager } from "../auctionRoomManager.js";

export const getLiveAuctionsViewerCounts = async (
  userId: string,
  ws: WebSocket,
) => {
  const ids = await redis.smembers("live:auctions");

  if (ids.length === 0) return;

  const pipeline = redis.pipeline();
  ids.forEach((id) => pipeline.zcard(`auction:${id}:bidders`));
  const results = await pipeline.exec();

  const liveAuctionsViewerCount = ids.map((id, index) => ({
    auctionId: id,
    viewerCount:
      results && results[index] ? (results[index][1] as number) || 0 : 0,
  }));

  ws.send(
    JSON.stringify({
      type: "live_auctions_feed",
      payload: { liveAuctionsViewerCount },
    }),
  );
};

export const joinAuctionRoom = async (
  userId: string,
  username: string,
  auctionId: string,
  ws: WebSocket,
) => {
  const pipeline = redis.pipeline();

  // sorted sets for tracking bidders
  pipeline.zadd(`auction:${auctionId}:bidders`, Date.now(), userId);
  // string for username
  pipeline.set(`user:${userId}:username`, username);

  await pipeline.exec();

  const viewerCount = await redis.zcard(`auction:${auctionId}:bidders`);

  const rawData = {
    type: "new_user_joined",
    payload: {
      userId: userId,
      viewerCount: viewerCount,
      username: username,
      joinedAt: Date.now(),
    },
  };

  auctionRoomManager.joinAuctionRoom();
};
