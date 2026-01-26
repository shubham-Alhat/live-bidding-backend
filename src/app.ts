import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import authRouter from "./routes/auth.route.js";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
dotenv.config();

const app = express();

app.use(express.json({ limit: "60kb" }));
app.use(express.urlencoded({ extended: true, limit: "60kb" }));
app.use(cookieParser());
app.use(express.static("public"));

const server = http.createServer(app);

app.use("/api/v1/auth", authRouter);

export default server;
