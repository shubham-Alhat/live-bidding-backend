import WebSocket from "ws";
import redis from "../redis/redis.js";
import { auctionRoomManager } from "../auctionRoomManager.js";
import { getParticipantsList } from "./helper.js";
import { bidScript } from "../redis/bidScript.js";

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

  pipeline.zadd(`auction:${auctionId}:bidders`, Date.now(), userId);
  pipeline.set(`user:${userId}:username`, username);
  pipeline.zcard(`auction:${auctionId}:bidders`);
  pipeline.hgetall(`auction:${auctionId}:state`);
  pipeline.zrevrange(`auction:${auctionId}:bids`, 0, 0, "WITHSCORES");
  pipeline.zcard(`auction:${auctionId}:bids`);

  const result = await pipeline.exec();

  if (!result) throw new Error("Pipeline returned null");

  const viewerCount = (result[2]?.[1] ?? 0) as number;

  // Record<string, string> - means a object where key and values are strings
  const state = (result[3]?.[1] ?? null) as Record<string, string | null>;

  if (!state) throw new Error(`Auction ${auctionId} state not found in Redis`);

  const topBid = (result[4]?.[1] ?? []) as string[] | [];

  const bidCount = (result[5]?.[1] ?? 0) as number;

  let currentHighestBidAmount = Number(state.startingPrice);
  let currentHighestBidder = null;
  if (topBid && topBid.length > 0) {
    currentHighestBidAmount = Number(topBid[1]);
    currentHighestBidder =
      (await redis.get(`user:${topBid[0]}:username`)) ?? "Unknown";
  }

  const participants = await getParticipantsList(auctionId);

  // send auction data to personal ws
  ws.send(
    JSON.stringify({
      type: "current_auction_data",
      payload: {
        bidCount: bidCount,
        currentHighestBidAmount: currentHighestBidAmount,
        currentHighestBidder: currentHighestBidder,
        nextMinBidAmount: currentHighestBidAmount + 1,
        startTime: state.startTime,
        endTime: state.endTime,
        auctionStatus: state.status,
      },
    }),
  );

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

export const placeNewBid = async (
  userId: string,
  username: string,
  bidAmount: number,
  auctionId: string,
  ws: WebSocket,
) => {
  const STATE_KEY = `auction:${auctionId}:state`;
  const BIDS_KEY = `auction:${auctionId}:bids`;

  const result = await bidScript(userId, bidAmount, STATE_KEY, BIDS_KEY);

  if (!result.success) {
    ws.send(JSON.stringify({ type: result.reason, payload: result }));
    return;
  }

  const rawData = {
    type: "new_bid_placed",
    payload: {
      username: username,
      bidAmount: result.bidAmount,
      bidCount: result.bidCount,
      nextMinBid: result.nextMinBid,
    },
  };

  auctionRoomManager.broadcastInAuction(auctionId, rawData);
};
