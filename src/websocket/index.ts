import http from "http";
import url from "url";
import type { decodedTokenState } from "../middleware/auth.middleware.js";
import jwt from "jsonwebtoken";
import { WebSocketServer } from "ws";

function onSocketError(err: Error) {
  console.log(err);
}

export const initWebsocketServer = (server: http.Server) => {
  const wss = new WebSocketServer({ noServer: true, path: "/ws" });

  wss.on("connection", (ws) => {
    console.log(`🟢 New connection...`);

    ws.on("close", () => {
      console.log(`🔴 User disconnected...`);
    });
  });

  server.on("upgrade", (request, socket, head) => {
    // because during upgrade, there could be malformed and more. (more chances to get error)
    socket.on("error", onSocketError);

    const parsedUrl = url.parse(request.url!, true);
    const token = parsedUrl.query.token;

    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    try {
      const secretKey: any = process.env.JWT_SECRET;

      const decodedToken = jwt.verify(
        token as string,
        secretKey,
      ) as decodedTokenState;

      // remove error listener when successfull connection.
      // now we need cleanup because now its all of ws. not a raw TCP connection.
      // further error will get handled by ws now
      socket.removeListener("error", onSocketError);

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } catch (error) {
      console.log(error);
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
  });
};
