import { initAuctionState } from "./handlers/helper.js";
import type { Auction, AuctionState } from "./types/types.js";

export const auctionRegistry: Map<string, AuctionState> = new Map();
export const auctionInstances: Map<string, AuctionManager> = new Map();

export class AuctionManager {
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(auction: Auction) {
    const remainingTime = initAuctionState(auction);
    this.startAuctionTimer(auction.id, remainingTime);
  }

  startAuctionTimer = (auctionId: string, remainingTime: number) => {
    console.log("timer started...");
    console.log(auctionRegistry);
    this.timer = setTimeout(() => {
      this.endAuction(auctionId);
    }, remainingTime * 1000);
  };

  endAuction = (auctionId: string) => {
    if (this.timer) clearTimeout(this.timer);
    auctionRegistry.delete(auctionId);
    auctionInstances.delete(auctionId);

    console.log("auction ended, registry:", auctionRegistry);
  };
}
