import WebSocket from "ws";
import { initAuctionState, serializeAuctionState } from "./handlers/helper.js";
import type { Auction, AuctionState } from "./types/types.js";
import { prisma } from "../db/prisma.js";
import redis from "../redis/redis.js";

export const auctionRegistry: Map<string, AuctionState> = new Map();
export const auctionInstances: Map<string, AuctionManager> = new Map();

export class AuctionManager {
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(auction: Auction) {
    const remainingTime = initAuctionState(auction);
    this.startAuctionTimer(auction.id, remainingTime);
  }

  initAuctionInRedis = async (auction: Auction) => {
    // timer configuration
    const startTimeMs = new Date(auction.startTime).getTime();
    const endTimeMs = startTimeMs + auction.auctionDuration * 1000;
    // remaining seconds
    const remainingTime = Math.floor((endTimeMs - Date.now()) / 1000);
    // hash - auction state
    await redis.hset(`auction:${auction.id}:state`, {
      auctionId: auction.id,
      status: "LIVE",
      startingPrice: auction.startingPrice,
      startTime: startTimeMs / 1000,
      endTime: endTimeMs / 1000,
      remainingTime: remainingTime,
    });

    // string - auction viewerCount
    await redis.set(`auction:${auction.id}:views`, 0);
  };

  startAuctionTimer = (auctionId: string, remainingTime: number) => {
    console.log("timer started...");
    console.log(auctionRegistry);
    this.timer = setTimeout(() => {
      this.endAuction(auctionId);
    }, remainingTime * 1000);
  };

  endAuction = async (auctionId: string) => {
    if (this.timer) clearTimeout(this.timer);

    // send 'end auction' to all connected client
    await this.broadcastAuctionEnded(auctionId);
    console.log("auction ended, registry:", auctionRegistry);
  };

  broadcastAuctionEnded = async (auctionId: string) => {
    const auctionState = auctionRegistry.get(auctionId);

    if (!auctionState) return;

    auctionState.status = "ended";

    const rawData = {
      type: "auction_ended",
      payload: {
        auctionId: auctionId,
        winner: auctionState.currentHighestBid ?? null,
        endTime: auctionState.endTime,
        auctionState: serializeAuctionState(auctionState),
      },
    };

    auctionState.participants.forEach((participant) => {
      if (participant.ws.readyState === WebSocket.OPEN) {
        participant.ws.send(JSON.stringify(rawData));
      }
    });

    // update in db
    try {
      await prisma.auction.update({
        where: { id: auctionId },
        data: { status: "ENDED" },
      });
    } catch (err) {
      console.error(`Failed to update auction ${auctionId} status in DB:`, err);
    }

    // delete in memory states
    auctionRegistry.delete(auctionId);
    auctionInstances.delete(auctionId);
  };
}
