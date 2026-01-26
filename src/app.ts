import express from "express";
import http from "http";
import { WebSocketServer } from "ws";

const app = express();

const server = http.createServer(app);

app.get("/health", (req, res) => {
  res.send({ message: "I am OK" });
});

export default server;
