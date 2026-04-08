import type {
  Auction,
  AuctionState,
  AuctionStateSerialize,
} from "../types/types.js";
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
      isBidProcessing: false,
      nextBidAmount: auction.startingPrice + 1,
      startingPrice: auction.startingPrice,
      currentHighestBid: null,
      startTime: startTimeMs / 1000,
      endTime: endTimeMs / 1000,
      remainingTime: remainingTime,
      status: "active",
    });
  }

  return remainingTime;
};

export const serializeAuctionState = (
  state: AuctionState,
): AuctionStateSerialize => {
  return {
    auctionId: state.auctionId,
    viewerCount: state.viewerCount,
    bids: state.bids,
    currentHighestBid: state.currentHighestBid,
    startTime: state.startTime,
    nextBidAmount: state.nextBidAmount,
    startingPrice: state.startingPrice,
    endTime: state.endTime,
    remainingTime: state.remainingTime,
    status: state.status,
    participants: Array.from(state.participants.values()).map(
      ({ userId, username, joinedAt }) => ({
        userId,
        username,
        joinedAt,
      }),
    ),
  };
};
