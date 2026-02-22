import type { Auction } from "../types/types.js";
import { auctionRegistry } from "../auctionStateManager.js";

export const initAuctionState = (auction: Auction) => {
  // timer configuration
  const startTimeMs = new Date(auction.startTime).getTime();
  const endTimeMs = startTimeMs + auction.auctionDuration * 1000;
  // remaining seconds
  const remainingTime = Math.floor((endTimeMs - Date.now()) / 1000);

  if (!auctionRegistry.has(auction.id)) {
    auctionRegistry.set(auction.id, {
      auctionId: auction.id,
      participants: new Map(),
      viewerCount: 0,
      bids: [],
      currentHighestBid: null,
      startTime: startTimeMs / 1000,
      endTime: endTimeMs / 1000,
      remainingTime: remainingTime,
      status: "active",
    });
  }

  return remainingTime;
};

export const 
