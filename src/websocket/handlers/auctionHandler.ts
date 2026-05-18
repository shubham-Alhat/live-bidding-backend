import WebSocket from "ws";
import redis from "../redis/redis.js";
import { auctionRoomManager } from "../auctionRoomManager.js";
import { getParticipantsList } from "./helper.js";

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
  // attach the auctionId to ws for onclose event
  ws.auctionId = auctionId;

  // update in auctionRoom
  auctionRoomManager.joinAuctionRoom(auctionId, ws);

  const pipeline = redis.pipeline();

  // sorted sets for tracking bidders
  pipeline.zadd(`auction:${auctionId}:bidders`, Date.now(), userId);
  // string for username
  pipeline.set(`user:${userId}:username`, username);

  await pipeline.exec();

  const [viewerCount, participants] = await Promise.all([
    redis.zcard(`auction:${auctionId}:bidders`),
    getParticipantsList(auctionId),
  ]);

  // also need to send bids if there

  const rawData = {
    type: "new_user_joined",
    payload: {
      userId: userId,
      viewerCount: viewerCount,
      username: username,
      participants: participants,
    },
  };

  auctionRoomManager.broadcastInAuction(auctionId, rawData);
};

export const leaveAuction = async (
  userId: string,
  username: string,
  auctionId: string,
  ws: WebSocket,
) => {
  ws.auctionId = undefined;

  // update auction room
  auctionRoomManager.leaveAuctionRoom(auctionId, ws);

  const pipeline = redis.pipeline();

  pipeline.zrem(`auction:${auctionId}:bidders`, userId);
  pipeline.del(`user:${userId}:username`);

  await pipeline.exec();

  const [viewerCount, participants] = await Promise.all([
    redis.zcard(`auction:${auctionId}:bidders`),
    getParticipantsList(auctionId),
  ]);

  const rawData = {
    type: "user_leave_auction",
    payload: {
      userId: userId,
      username: username,
      viewerCount: viewerCount,
      participants: participants,
    },
  };

  auctionRoomManager.broadcastInAuction(auctionId, rawData);
};
