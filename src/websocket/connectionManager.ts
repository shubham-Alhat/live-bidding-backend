import type { WebSocket } from "ws";

// this is actually maintain/handle the activeConnections with userId -> ws

class ConnectionManager {
  private activeConnections: Map<string, WebSocket> = new Map();

  addNewConnection = (userId: string, ws: WebSocket) => {
    if (this.activeConnections.has(userId)) {
      const existingWs = this.activeConnections.get(userId)!;
      existingWs.terminate();
    }

    this.activeConnections.set(userId, ws);
    console.log("new connection added", [...this.activeConnections.keys()]);
  };

  removeConnection = (userId: string) => {
    this.activeConnections.delete(userId);
    console.log("connection removed", [...this.activeConnections.keys()]);
  };

  getActiveConnectionState = () => {
    return this.activeConnections;
  };

  getConnection = (userId: string) => {
    return this.activeConnections.get(userId);
  };
}

export const connectionManager = new ConnectionManager();
