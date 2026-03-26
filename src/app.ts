import express from "express";
import http from "http";
import authRouter from "./routes/auth.route.js";
import productRouter from "./routes/product.route.js";
import auctionRouter from "./routes/auction.route.js";
import bidRouter from "./routes/bid.route.js";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import passport from "passport";
import "./passport/googleStrategy.js";
import { WebSocketManager } from "./websocket/websocketManager.js";
import { connectionManager } from "./websocket/connectionManager.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "60kb" }));
app.use(express.urlencoded({ extended: true, limit: "60kb" }));
app.use(cookieParser());
app.use(express.static("public"));
app.use(passport.initialize());

const server = http.createServer(app);

const wsManager = new WebSocketManager(server);

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/product", productRouter);
app.use("/api/v1/auction", auctionRouter);
app.use("/api/v1/bid", bidRouter);

app.get("/health", (req, res) => res.json({ status: "ok" }));

export default server;
