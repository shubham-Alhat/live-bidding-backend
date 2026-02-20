import type WebSocket from "ws";
interface RawDataState {
  type: string;
  payload: any;
}

export class EventRouter {
  async route(
    ws: WebSocket,
    userId: string,
    rawData: RawDataState,
  ): Promise<void> {
    switch (rawData.type) {
      case "user_connected":
        console.log(`user_conncted ${userId} event hit..`);
        break;

      case "get_all_auctions":
        console.log("get-all-auctions whicb are live");
        break;

      default:
        console.log(`Unknown event type: ${rawData.type}`);
    }
  }
}
