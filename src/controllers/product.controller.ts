import type { Request, Response } from "express";
import { uploadOnCloudinary } from "../lib/cloudinary.js";
import { prisma } from "../db/prisma.js";
import { initAuctionInRedis } from "../websocket/handlers/helper.js";
import { v2 as cloudinary } from "cloudinary";

// helper function
const MIN_PRICE = 1;
const MAX_PRICE = 10_000_000;

import fs from "fs/promises";

type PriceResult = { ok: true; value: number } | { ok: false; error: string };

function parsePrice(raw: unknown, label: string): PriceResult {
  const str =
    typeof raw === "number"
      ? String(raw)
      : typeof raw === "string"
        ? raw.trim()
        : "";
  if (!str) return { ok: false, error: `${label} is required` };
  if (!/^[1-9]\d*$/.test(str))
    return { ok: false, error: `${label} must be a positive whole number` };

  const num = Number(str);
  if (!Number.isSafeInteger(num) || num > MAX_PRICE) {
    return { ok: false, error: `${label} cannot exceed ${MAX_PRICE}` };
  }
  return { ok: true, value: num };
}

export const createNewProduct = async (req: Request, res: Response) => {
  try {
    const imageFile = req.file;
    const { name, description, startingPrice, buyNowPrice } = req.body ?? {};
    const user = req.authUser;

    if (!user?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (typeof name !== "string" || !name.trim() || name.trim().length > 100) {
      return res
        .status(400)
        .json({ success: false, message: "Name is required (max 100 chars)" });
    }
    if (
      typeof description !== "string" ||
      !description.trim() ||
      description.trim().length > 2000
    ) {
      return res.status(400).json({
        success: false,
        message: "Description is required (max 2000 chars)",
      });
    }

    const start = parsePrice(startingPrice, "Starting price");
    if (!start.ok)
      return res.status(400).json({ success: false, message: start.error });

    const buyNow = parsePrice(buyNowPrice, "Buy now price");
    if (!buyNow.ok)
      return res.status(400).json({ success: false, message: buyNow.error });

    if (buyNow.value <= start.value) {
      return res.status(400).json({
        success: false,
        message: "Buy now price must be greater than the starting price",
      });
    }

    if (!imageFile || !imageFile.path) {
      return res
        .status(400)
        .json({ success: false, message: "At least 1 photo is required" });
    }

    //   get the image url
    const cloudinaryResponse = await uploadOnCloudinary(imageFile.path);

    if (!cloudinaryResponse?.secure_url) {
      fs.unlink(imageFile.path);
      return res
        .status(500)
        .json({ message: "cloudinary secure url not found", data: null });
    }

    const newProduct = await prisma.product.create({
      data: {
        name: name.trim(),
        description: description.trim(),
        startingPrice: start.value,
        buyNowPrice: buyNow.value,
        ownerId: user.id,
        image: cloudinaryResponse.secure_url,
        image_public_id: cloudinaryResponse.public_id,
      },
    });

    return res.status(201).json({
      success: true,
      message: "New product created!",
      data: newProduct,
    });
  } catch (error) {
    console.error("createNewProduct:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error creating product", data: null });
  }
};

export const getAllSellerProducts = async (req: Request, res: Response) => {
  try {
    const seller = req.authUser;

    if (!seller || !seller.id) {
      return res.status(401).json({ message: "Unauthorized", data: null });
    }

    // fetch all products here
    const products = await prisma.product.findMany({
      where: {
        ownerId: seller.id,
      },
    });

    return res.status(200).json({
      message: "Seller products fetched successfully",
      data: products,
    });
  } catch (error) {
    console.log("Error while fetching sellers products");
    return res.status(500).json({
      message: "Error while fetchings products",
      data: null,
    });
  }
};
