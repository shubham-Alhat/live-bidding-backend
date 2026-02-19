import WebSocket from "ws";

const activeConnections: Map<string, WebSocket> = new Map();

export const addUserConnection = (userId: string, ws: WebSocket) => {
  if (activeConnections.has(userId)) {
    const existingWs = activeConnections.get(userId)!;
    // close the old connection
    existingWs.close();
    console.log(`closing existing connection for ${userId}, replacing it`);
  }

  activeConnections.set(userId, ws);
  console.log(`added connection userId ${userId}`);
};

export const removeUserConnection = (userId: string) => {
  if (activeConnections.has(userId)) {
    activeConnections.delete(userId);
    console.log(`userId ${userId} is removed`);

    return;
  }

  console.log(`userId ${userId} not found in activeConnections`);
};
