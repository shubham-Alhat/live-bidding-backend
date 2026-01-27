import type { Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const generateAccessToken = (id: string, email: string): string => {
  const secretKey = process.env.JWT_SECRET;

  if (!secretKey) {
    throw new Error("JWT_SECRET is not defined");
  }

  const payload = {
    id,
    email,
  };

  return jwt.sign(payload, secretKey, {
    expiresIn: "1d",
  });
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
    const token = generateAccessToken(user.id, user.email);

    // sanitize response
    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
    };

    return res
      .status(200)
      .cookie("accessToken", token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
        path: "/",
      })
      .json({
        message: "User login successfully",
        data: safeUser,
      });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error in login", data: null });
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
    const currentUser = req.user;

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
