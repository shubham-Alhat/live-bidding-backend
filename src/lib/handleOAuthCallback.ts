import dotenv from "dotenv";
import type { Response, Request } from "express";
import { prisma } from "../db/prisma.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../controllers/auth.controller.js";

dotenv.config();

export const handleOAuthCallback = async (req: Request, res: Response) => {
  try {
    const profile = req.user;

    if (!profile || !profile.email) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=auth_failed`,
      );
    }

    let user = await prisma.user.findUnique({
      where: {
        email: profile.email,
      },
      select: {
        id: true,
        email: true,
        username: true,
      },
    });

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: profile.email,
          username: profile.username,
          password: "",
        },
        omit: {
          password: true,
        },
      });
    }

    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);

    return res.redirect(
      `${process.env.FRONTEND_URL}/api/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`,
    );
  } catch (error) {
    console.error("OAuth callback error:", error);
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
  }
};
