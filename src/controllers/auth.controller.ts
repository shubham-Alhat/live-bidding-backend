import type { Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { decodedTokenState } from "../middleware/auth.middleware.js";

export const generateAccessToken = (id: string, email: string): string => {
  const secretKey = process.env.ACCESS_TOKEN_SECRET;

  if (!secretKey) {
    throw new Error("ACCESS_TOKEN_SECRET is not defined");
  }

  const payload = {
    id,
    email,
  };

  return jwt.sign(payload, secretKey, {
    expiresIn: "1h",
  });
};

export const generateRefreshToken = (id: string, email: string): string => {
  const secretKey = process.env.REFRESH_TOKEN_SECRET;

  if (!secretKey) {
    throw new Error("REFRESH_TOKEN_SECRET is not defined");
  }

  const payload = {
    id,
    email,
  };

  return jwt.sign(payload, secretKey, {
    expiresIn: "7d",
  });
};

export const refreshAccessToken = async (req: Request, res: Response) => {
  try {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
      return res
        .status(401)
        .json({ message: "refresh token not found", data: null });
    }

    const secretKey = process.env.REFRESH_TOKEN_SECRET;

    if (!secretKey) {
      throw new Error("REFRESH_TOKEN_SECRET is not defined");
    }

    const decodedToken = jwt.verify(
      incomingRefreshToken,
      secretKey,
    ) as decodedTokenState;

    const existingUser = await prisma.user.findUnique({
      where: {
        id: decodedToken.id,
      },
    });

    if (!existingUser) {
      return res
        .status(401)
        .json({ message: "user not found in refresh token", data: null });
    }

    // check/match the incomingRefreshToken sent by user with refreshToken which is in db.
    if (existingUser.refreshToken !== incomingRefreshToken) {
      return res
        .status(401)
        .json({ message: "refresh token expired or modified", data: null });
    }

    // generate new tokens
    const accessToken = generateAccessToken(
      existingUser.id,
      existingUser.email,
    );
    const refreshToken = generateRefreshToken(
      existingUser.id,
      existingUser.email,
    );

    // update new refresh token in db
    await prisma.user.update({
      where: {
        id: existingUser.id,
      },
      data: {
        refreshToken: refreshToken,
      },
    });

    return res
      .status(200)
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 1000,
        path: "/",
      })
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      })
      .json({
        message: "Access token refreshed successfully",
        data: null,
      });
  } catch (error) {
    console.log("error in refresh controller - ", error);
    if (error instanceof jwt.TokenExpiredError) {
      return res
        .status(401)
        .json({ message: "Refresh Token expired", data: null });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res
        .status(401)
        .json({ message: "Invalid Refresh token", data: null });
    }
    return res.status(500).json({
      message: "Error in refresh controller",
      error: error,
      data: null,
    });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "All fields are required", data: null });
    }

    // find the user
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found", data: null });
    }

    // check password
    const isCorrectPassword = await bcrypt.compare(password, user.password);

    if (!isCorrectPassword) {
      return res.status(401).json({
        message: "Username or Password invalid",
        data: null,
      });
    }

    // generate tokens
    const accessToken = generateAccessToken(user.id, user.email);

    const refreshToken = generateRefreshToken(user.id, user.email);

    // store refresh token in db.
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        refreshToken: refreshToken,
      },
    });

    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 1000,
        path: "/",
      })
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      })
      .json({
        message: "User login successfully",
        data: safeUser,
      });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Error in login", error: error, data: null });
  }
};

export const signupUser = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
        data: null,
      });
    }

    // check existing user email
    const existingEmail = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (existingEmail) {
      return res.status(400).json({ message: "duplicate email", data: null });
    }

    // hash the password
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    // create new entry in db
    const newUser = await prisma.user.create({
      data: {
        username: username,
        password: hashPassword,
        email: email,
      },
      omit: {
        password: true,
      },
    });

    return res
      .status(201)
      .json({ message: "User created successfully", data: newUser });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error in signup", data: null });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const currentUser = req.authUser;

    if (!currentUser) {
      return res.status(404).json({ message: "User not found!!", data: null });
    }

    return res
      .status(200)
      .json({ message: "Current user found", data: currentUser });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Error in getting user", data: null });
  }
};

export const logoutUser = async (req: Request, res: Response) => {
  try {
    const currentUser = req.authUser;

    if (!currentUser) {
      return res
        .status(404)
        .json({ message: "User not found in middleware", data: null });
    }

    // clear refreshToken in db
    await prisma.user.update({
      where: {
        id: currentUser.id,
      },
      data: {
        refreshToken: null,
      },
    });

    return res
      .status(200)
      .clearCookie("accessToken", {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 15 * 60 * 1000,
        path: "/",
      })
      .clearCookie("refreshToken", {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 1000,
        path: "/",
      })
      .json({ message: "User logout successfully", data: null });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error in logout", data: null });
  }
};
