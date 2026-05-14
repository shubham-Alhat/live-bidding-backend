import { WebSocket } from "ws";
import type { RawDataState } from "./types/types.js";

class AuctionRoomManager {
  private rooms: Map<string, Set<WebSocket>> = new Map();

  joinAuctionRoom = (auctionId: string, ws: WebSocket) => {
    if (!this.rooms.has(auctionId)) {
      this.rooms.set(auctionId, new Set());
    }

    this.rooms.get(auctionId)!.add(ws);
  };

  leaveAuctionRoom = (auctionId: string, ws: WebSocket) => {
    const room = this.rooms.get(auctionId);
    if (!room) return;

    room.delete(ws);

    if (room.size === 0) {
      this.rooms.delete(auctionId);
    }
  };

  broadcastInAuction = (auctionId: string, data: RawDataState) => {
    const auctionRoom = this.rooms.get(auctionId);
    if (!auctionRoom) return;

    const message = JSON.stringify(data);

    auctionRoom.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  };
}

export const auctionRoomManager = new AuctionRoomManager();
