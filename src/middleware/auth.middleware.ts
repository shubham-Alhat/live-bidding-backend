import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma.js";
import dotenv from "dotenv";
dotenv.config();

type decodedTokenState = {
  id: string;
  email: string;
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

    const secretKey: any = process.env.JWT_SECRET;

    if (!secretKey) {
      console.error("JWT_SECRET is not defined");
      return res
        .status(500)
        .json({ message: "Server configuration error", data: null });
    }

    const decodedToken = jwt.verify(token, secretKey) as decodedTokenState;

    const user = await prisma.user.findUnique({
      where: {
        email: decodedToken.email,
      },
      omit: {
        password: true,
      },
    });

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found in middleware", data: null });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "Invalid token", data: null });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: "Token expired", data: null });
    }

    return res
      .status(500)
      .json({ message: "Error in auth middleware", data: null });
  }
};

export default authMiddleware;
