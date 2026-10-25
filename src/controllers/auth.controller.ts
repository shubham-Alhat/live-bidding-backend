import type { Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { decodedTokenState } from "../middleware/auth.middleware.js";
import { uploadOnCloudinary } from "../lib/cloudinary.js";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { Prisma } from "../generated/prisma/client.js";

export const generateAccessToken = (id: string, username: string): string => {
  const secretKey = process.env.ACCESS_TOKEN_SECRET;

  if (!secretKey) {
    throw new Error("ACCESS_TOKEN_SECRET is not defined");
  }

  const payload = {
    id,
    username,
  };

  return jwt.sign(payload, secretKey, {
    expiresIn: "1h",
    algorithm: "HS256",
  });
};

export const generateRefreshToken = (id: string, username: string): string => {
  const secretKey = process.env.REFRESH_TOKEN_SECRET;

  if (!secretKey) {
    throw new Error("REFRESH_TOKEN_SECRET is not defined");
  }

  const payload = {
    id,
    username,
  };

  return jwt.sign(payload, secretKey, {
    expiresIn: "7d",
    algorithm: "HS256",
  });
};

export const refreshAccessToken = async (req: Request, res: Response) => {
  try {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

    console.log("incomingRefreshToken:", incomingRefreshToken);

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
      console.log("user not found using refresh token.");
      return res
        .status(401)
        .json({ message: "user not found in refresh token", data: null });
    }

    // check/match the incomingRefreshToken sent by user with refreshToken which is in db.
    if (existingUser.refreshToken !== incomingRefreshToken) {
      console.log("DB token not matched with incoming refresh token");
      return res
        .status(401)
        .json({ message: "refresh token expired or modified", data: null });
    }

    // generate new tokens
    const accessToken = generateAccessToken(
      existingUser.id,
      existingUser.username,
    );
    const refreshToken = generateRefreshToken(
      existingUser.id,
      existingUser.username,
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
        domain: ".bidhub.in",
      })
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
        domain: ".bidhub.in",
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
    const accessToken = generateAccessToken(user.id, user.username);

    const refreshToken = generateRefreshToken(user.id, user.username);

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
        domain:
          process.env.NODE_ENV === "production" ? ".bidhub.in" : undefined,
      })
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
        domain:
          process.env.NODE_ENV === "production" ? ".bidhub.in" : undefined,
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

export const getCurrentSeller = async (req: Request, res: Response) => {
  try {
    const currentSeller = req.authUser;

    if (!currentSeller) {
      return res
        .status(404)
        .json({ message: "Seller not found!!", data: null });
    }

    // verify seller using kyc

    return res
      .status(200)
      .json({ message: "Current seller found", data: currentSeller });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Error in getting seller", data: null });
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
        maxAge: 60 * 60 * 1000,
        path: "/",
        domain:
          process.env.NODE_ENV === "production" ? ".bidhub.in" : undefined,
      })
      .clearCookie("refreshToken", {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
        domain:
          process.env.NODE_ENV === "production" ? ".bidhub.in" : undefined,
      })
      .json({ message: "User logout successfully", data: null });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error in logout", data: null });
  }
};

const BIO_MAX = 160;

type Changes = { username?: string; email?: string; bio?: string };

function validate({ username, email, bio }: Changes) {
  if (username !== undefined) {
    if (username.length < 3) return "Username must be at least 3 characters.";
    if (username.length > 20) return "Username can be at most 20 characters.";
    if (!/^[a-zA-Z0-9_. ]+$/.test(username))
      return "Only letters, numbers, spaces, dots and underscores are allowed.";
    if (/\s{2,}/.test(username))
      return "Username can't have multiple spaces in a row.";
  }
  if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return "Enter a valid email address.";
  if (bio !== undefined) {
    if (!bio) return "Please add a bio so buyers can know your shop!";
    if (bio.length > BIO_MAX)
      return `Bio must be at most ${BIO_MAX} characters.`;
  }
  return null;
}

export const updateProfile = async (req: Request, res: Response) => {
  const user = req.authUser;
  if (!user) {
    return res.status(401).json({ message: "Unauthorized", data: null });
  }

  const filePath = req.file?.path;
  let newPublicId: string | null = null; // remember the new upload so we can undo it if DB fails

  try {
    // 1. current data from DB
    const current = await prisma.user.findUnique({ where: { id: user.id } });
    if (!current) {
      return res
        .status(404)
        .json({ message: "User not found in DB", data: null });
    }

    // user must end up with an avatar
    if (!filePath && !current.avatar) {
      return res
        .status(400)
        .json({ message: "User avatar is required!", data: null });
    }

    // 2. collect ONLY the fields that changed
    const body = req.body as {
      username?: string;
      email?: string;
      bio?: string;
    };
    const incoming = {
      username: body.username?.trim(),
      email: body.email?.trim().toLowerCase(),
      bio: body.bio?.trim(),
    };

    const changes: Changes = {};
    if (
      incoming.username !== undefined &&
      incoming.username !== current.username
    )
      changes.username = incoming.username;
    if (incoming.email !== undefined && incoming.email !== current.email)
      changes.email = incoming.email;
    if (incoming.bio !== undefined && incoming.bio !== (current.bio ?? ""))
      changes.bio = incoming.bio;

    if (!filePath && Object.keys(changes).length === 0) {
      return res.status(400).json({ message: "Nothing to update", data: null });
    }

    // 3. validate only the changed fields (before spending an upload)
    const error = validate(changes);
    if (error) return res.status(400).json({ message: error, data: null });

    // check if username and email already taken by other user
    // check for a clash with ANOTHER user, before spending an upload
    if (changes.username !== undefined || changes.email !== undefined) {
      const clash = await prisma.user.findFirst({
        where: {
          id: { not: user.id },
          OR: [
            ...(changes.username !== undefined
              ? [{ username: changes.username }]
              : []),
            ...(changes.email !== undefined ? [{ email: changes.email }] : []),
          ],
        },
        select: { username: true, email: true },
      });

      if (clash) {
        const msg =
          clash.username === changes.username
            ? "That username is already taken"
            : "That email is already registered";
        return res.status(409).json({ message: msg, data: null });
      }
    }

    // 4. build the Prisma data from the changes
    const data: Prisma.UserUpdateInput = { ...changes };

    // tokens contain the username, so only re-issue them if it changed
    let newAccessToken: string | undefined;
    let newRefreshToken: string | undefined;
    if (changes.username !== undefined) {
      newAccessToken = generateAccessToken(current.id, changes.username);
      newRefreshToken = generateRefreshToken(current.id, changes.username);
      data.refreshToken = newRefreshToken; // saved in the SAME update
    }

    // 5. upload new avatar if there is one
    if (filePath) {
      const uploaded = await uploadOnCloudinary(filePath);
      if (!uploaded?.secure_url) {
        return res
          .status(500)
          .json({ message: "Avatar upload failed", data: null });
      }
      newPublicId = uploaded.public_id;
      data.avatar = uploaded.secure_url;
      data.avatar_public_id = uploaded.public_id;
    }

    // 6. ONE db write
    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
    });

    // DB now owns the new avatar, so the catch block must never delete it
    const avatarReplaced = newPublicId !== null;
    newPublicId = null;

    // 7. safe to delete the OLD avatar now
    if (avatarReplaced && current.avatar_public_id) {
      cloudinary.uploader
        .destroy(current.avatar_public_id, { invalidate: true })
        .catch((e) => console.log("old avatar cleanup failed", e));
    }

    // 8. never send secrets to the client
    const { password, refreshToken, ...safeUser } = updated;

    // 9. set cookies only if tokens were re-issued
    if (newAccessToken && newRefreshToken) {
      const domain =
        process.env.NODE_ENV === "production" ? ".bidhub.in" : undefined;

      res
        .cookie("accessToken", newAccessToken, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          maxAge: 60 * 60 * 1000,
          path: "/",
          domain,
        })
        .cookie("refreshToken", newRefreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: "/",
          domain,
        });
    }

    return res.status(200).json({ message: "Profile updated", data: safeUser });
  } catch (error) {
    // DB failed after upload: delete the new image so it doesn't become an orphan
    if (newPublicId) {
      await cloudinary.uploader.destroy(newPublicId).catch(() => {});
    }

    // username or email already taken
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const field =
        (error.meta?.target as string[] | undefined)?.[0] ?? "value";
      return res
        .status(409)
        .json({ message: `That ${field} is already taken`, data: null });
    }

    console.log(error);
    return res
      .status(500)
      .json({ message: "Error while updating profile", data: null });
  } finally {
    // always delete the temp file multer saved
    if (filePath) await fs.promises.unlink(filePath).catch(() => {});
  }
};
