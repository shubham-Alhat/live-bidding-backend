import http from "http";
import url from "url";
import type { decodedTokenState } from "../middleware/auth.middleware.js";
import jwt from "jsonwebtoken";
import { WebSocketServer, WebSocket } from "ws";
import dotenv from "dotenv";
import { EventRouter } from "./eventRouter.js";

dotenv.config();

function onSocketError(err: Error) {
  console.log(err);
}

export class WebSocketManager {
  private wss: WebSocketServer;
  private router: EventRouter;

  constructor(server: http.Server) {
    this.wss = new WebSocketServer({ noServer: true, path: "/ws" });
    this.handleUpgradeConnection(server);
    this.connectToWsServer();
    this.router = new EventRouter();
  }

  private handleUpgradeConnection = (server: http.Server) => {
    server.on("upgrade", (req, socket, head) => {
      socket.on("error", onSocketError);
      try {
        const parsedUrl = url.parse(req.url!, true);
        const token = parsedUrl.query.token;

        if (!token) {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }

        // check token validy
        const secretKey: any = process.env.JWT_SECRET;

        const decodedToken = jwt.verify(
          token as string,
          secretKey,
        ) as decodedTokenState;

        // remove error listener when successfull connection.
        // now we need cleanup because now its all of ws. not a raw TCP connection.
        // further error will get handled by ws now
        socket.removeListener("error", onSocketError);

        this.wss.handleUpgrade(req, socket, head, (ws) => {
          this.wss.emit("connection", ws, req, decodedToken);
        });
      } catch (error) {
        console.log(error);
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }
    });
  };

  private connectToWsServer = () => {
    this.wss.on(
      "connection",
      (
        ws: WebSocket,
        req: http.IncomingMessage,
        decodedToken: decodedTokenState,
      ) => {
        console.log(`🟢 New connection ${decodedToken.id}`);

        ws.on("close", () => {
          console.log(`🔴 User disconnected ${decodedToken.id}`);
        });

        ws.on("error", (err: Error) => {
          console.error(`WebSocket error for ${decodedToken.id}:`, err);
          ws.close();
        });

        ws.on("message", (rawData) => {
          try {
            const data = JSON.parse(rawData.toString());

            this.router.route(ws, decodedToken.id, data);
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        });
      },
    );
  };
}
