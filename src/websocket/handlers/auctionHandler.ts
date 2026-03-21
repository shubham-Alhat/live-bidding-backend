import WebSocket from "ws";
import { auctionRegistry } from "../auctionStateManager.js";
import { serializeAuctionState } from "./helper.js";

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

  // check if user already joined auction
  if (!auctionState.participants.get(userId)) {
    // increase viewerCount only if user join newly
    auctionState.viewerCount = auctionState.viewerCount + 1;
  }

  auctionState.participants.set(userId, {
    userId: userId,
    username: username,
    ws: ws,
    joinedAt: Date.now(),
  });

  // create rawData
  const rawData = {
    type: "new_user_joined",
    payload: {
      userId: userId,
      username: username,
      joinedAt: Date.now(),
      auctionState: serializeAuctionState(auctionState),
    },
  };

  // broadcast to all clients in auction
  auctionState.participants.forEach((participant) => {
    if (participant.ws.readyState === WebSocket.OPEN) {
      participant.ws.send(JSON.stringify(rawData));
    }
  });
};

export const leaveAuction = (
  userId: string,
  username: string,
  auctionId: string,
) => {
  const auctionState = auctionRegistry.get(auctionId);

  if (!auctionState) {
    console.log("auction not found..");
    return;
  }

  // check if participant exist
  if (!auctionState.participants.get(userId)) {
    console.log("participant not found..");
    return;
  }

  // delete user from participants
  const isdeleted = auctionState.participants.delete(userId);

  // decrement viewerCount
  if (isdeleted) auctionState.viewerCount = auctionState.viewerCount - 1;

  const rawData = {
    type: "user_leave_auction",
    payload: {
      userId: userId,
      username: username,
      auctionState: serializeAuctionState(auctionState),
    },
  };

  auctionState.participants.forEach((participant) => {
    if (participant.ws.readyState === WebSocket.OPEN) {
      participant.ws.send(JSON.stringify(rawData));
    }
  });
};

export const placeNewBid = (
  userId: string,
  username: string,
  bidAmount: number,
  timestamp: number,
  auctionId: string,
  ws: WebSocket,
) => {
  // get the auction room
  const auctionState = auctionRegistry.get(auctionId);

  if (!auctionState) {
    console.log("auction not found while bidding");
    return;
  }

  if (auctionState.currentHighestBid?.amount) {
    // check if highest bid than prev
    if (bidAmount < auctionState.currentHighestBid.amount) {
      ws.send(
        JSON.stringify({
          type: "invalid_bid",
          payload: { auctionId: auctionId, userId: userId, username: username },
        }),
      );

      return;
    }
  }

  // save current highest bid
  auctionState.currentHighestBid = {
    id: crypto.randomUUID(),
    amount: bidAmount,
    timestamp: timestamp,
    userId: userId,
    userName: username,
  };

  // add to bids array
  auctionState.bids.unshift({
    id: crypto.randomUUID(),
    amount: bidAmount,
    timestamp: timestamp,
    userId: userId,
    userName: username,
  });

  // update nextBidAmount
  auctionState.nextBidAmount = auctionState.currentHighestBid.amount + 1;

  // create a rawData
  const rawData = {
    type: "new_bid_placed",
    payload: {
      userId: userId,
      username: username,
      bidAmount: bidAmount,
      auctionId: auctionId,
      auctionState: serializeAuctionState(auctionState),
    },
  };

  // broadcast to all
  auctionState.participants.forEach((participant) => {
    if (participant.ws.readyState === WebSocket.OPEN) {
      participant.ws.send(JSON.stringify(rawData));
    }
  });
};

export const getAllLiveAuctions = (userId: string, ws: WebSocket) => {
  const rawData = {
    type: "live_auctions_feed",
    payload: {
      liveAuctions: Array.from(auctionRegistry.values()).map(
        serializeAuctionState,
      ),
    },
  };

  ws.send(JSON.stringify(rawData));
};

export const rejoinAuction = (
  auctionId: string,
  userId: string,
  username: string,
  ws: WebSocket,
) => {
  const auctionState = auctionRegistry.get(auctionId);

  if (!auctionState) {
    console.log("auction not found...");
    return;
  }

  // add this new ws in this state

  auctionState.participants.set(userId, {
    userId: userId,
    username: username,
    ws: ws,
    joinedAt: Date.now(),
  });

  // create rawData
  const rawData = {
    type: "rejoin_auction_state",
    payload: {
      userId: userId,
      username: username,
      joinedAt: Date.now(),
      auctionState: serializeAuctionState(auctionState),
    },
  };

  // send to client
  ws.send(JSON.stringify(rawData));
};
