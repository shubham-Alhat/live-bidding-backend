import { loadScript } from "../websocket/redis/bidScript.js";
import { startAuctionWorker } from "../websocket/workers/auctionWorker.js";
import { startBidSyncWorker } from "../websocket/workers/bidSyncWorker.js";

export const bootstrap = async () => {
  await loadScript();
  const auctionWorker = startAuctionWorker();
  const bidSyncWorker = startBidSyncWorker();

  return { auctionWorker, bidSyncWorker };
};
