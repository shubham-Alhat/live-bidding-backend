import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import authRouter from "./routes/auth.route.js";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import passport from "passport";
import "../src/passport/googleStrategy.js";
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

app.use("/api/v1/auth", authRouter);

export default server;
