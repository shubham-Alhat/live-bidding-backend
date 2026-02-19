interface MessageData {
  type: string;
  message: any;
}

export const messageRouter = (ws: WebSocket, data: MessageData) => {
  if (data.type === "user_connected") {
  }
};
