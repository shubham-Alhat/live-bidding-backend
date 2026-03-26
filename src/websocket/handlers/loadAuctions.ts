import { prisma } from "../../db/prisma.js";
import { auctionRegistry } from "../auctionStateManager.js";

export const loadAllLiveAuctions = async () => {
  try {
    const auctions = await prisma.auction.findMany({
      where: {
        status: "ACTIVE",
      },
    });

    auctions.forEach((auction) => {
      // timer configuration
      const startTimeMs = new Date(auction.startTime).getTime();
      const endTimeMs = startTimeMs + auction.auctionDuration * 1000;
      // remaining seconds
      const remainingTime = Math.floor((endTimeMs - Date.now()) / 1000);
      auctionRegistry.set(auction.id, {
        auctionId: auction.id,
        participants: new Map(),
        viewerCount: 0,
        bids: [],
        startingPrice: auction.startingPrice.toNumber(),
        nextBidAmount: auction.startingPrice.toNumber() + 1,
        currentHighestBid: null,
        startTime: startTimeMs / 1000,
        endTime: endTimeMs / 1000,
        remainingTime: remainingTime,
        status: "active",
      });
    });
  } catch (error) {
    console.log(error);
  }
};
