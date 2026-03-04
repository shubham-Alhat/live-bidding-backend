import type WebSocket from "ws";
import {
  getAllLiveAuctions,
  joinAuction,
  leaveAuction,
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
        getAllLiveAuctions(userId, ws);
        break;

      case "user_joined_auction_room":
        joinAuction(userId, data.payload.username, data.payload.auctionId, ws);
        break;

      case "leave_auction":
        leaveAuction(userId, data.payload.username, data.payload.auctionId);
        break;

      default:
        console.log(`Unknown event type: ${data.type}`);
    }
  }
}
