import type WebSocket from "ws";
import {
  getLiveAuctionsViewerCounts,
  joinAuctionRoom,
} from "./handlers/auctionHandler.js";
import type { RawDataState } from "./types/types.js";

export class EventRouter {
  async route(
    ws: WebSocket,
    userId: string,
    data: RawDataState,
  ): Promise<void> {
    switch (data.type) {
      case "get_live_auction_feed":
        await getLiveAuctionsViewerCounts(userId, ws);
        break;

      case "user_joined_auction_room":
        await joinAuctionRoom(
          userId,
          data.payload.username,
          data.payload.auctionId,
          ws,
        );
        break;
      // case "rejoin_auction":
      //   rejoinAuction(
      //     data.payload.auctionId,
      //     userId,
      //     data.payload.username,
      //     ws,
      //   );
      //   break;

      // case "leave_auction":
      //   leaveAuction(userId, data.payload.username, data.payload.auctionId);
      //   break;
      // case "new_bid":
      //   placeNewBid(
      //     userId,
      //     data.payload.username,
      //     data.payload.bidAmount,
      //     data.payload.timestamp,
      //     data.payload.auctionId,
      //     ws,
      //   );
      //   break;

      default:
        console.log(`Unknown event type: ${data.type}`);
    }
  }
}
