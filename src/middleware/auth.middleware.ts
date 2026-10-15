import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma.js";
import dotenv from "dotenv";
dotenv.config();

export type decodedTokenState = {
  id: string;
  username: string;
  isGuest?: true;
};

const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ message: "No token found", data: null });
    }

    const secretKey: any = process.env.ACCESS_TOKEN_SECRET;

    if (!secretKey) {
      console.error("JWT_SECRET is not defined");
      return res
        .status(500)
        .json({ message: "Server configuration error", data: null });
    }

    const decodedToken = jwt.verify(token, secretKey) as decodedTokenState;

    if (decodedToken.isGuest && decodedToken.isGuest === true) {
      return res.status(403).json({
        message: "Guest are not allowed, Please login",
        data: null,
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        username: decodedToken.username,
      },
      omit: {
        password: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found in db & No Guest session",
        data: null,
      });
    }

    req.authUser = user;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: "Invalid token", data: null });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "Token expired", data: null });
    }

    return res
      .status(500)
      .json({ message: "Error in auth middleware", data: null });
  }
};

export default authMiddleware;
