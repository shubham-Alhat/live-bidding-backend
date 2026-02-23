import WebSocket from "ws";
import { auctionRegistry } from "../auctionStateManager.js";

export const joinAuction = (
  userId: string,
  username: string,
  auctionId: string,
  ws: WebSocket,
) => {
  // get the auction from registry
  const auctionState = auctionRegistry.get(auctionId);
  if (!auctionState) {
    console.log("auctionState not found");
    return;
  }

  auctionState.participants.set(userId, {
    userId: userId,
    username: username,
    ws: ws,
    joinedAt: Date.now(),
  });

  // increase viewerCount
  auctionState.viewerCount = auctionState.viewerCount + 1;

  // create rawData
  const rawData = {
    type: "new_user_joined",
    payload: {
      userId: userId,
      username: username,
    },
  };

  // broadcast to all clients in auction
  auctionState.participants.forEach((participant) => {
    if (participant.ws.readyState === WebSocket.OPEN) {
      participant.ws.send(JSON.stringify(rawData));
    }
  });
};
