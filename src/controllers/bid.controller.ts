import type { Request, Response } from "express";
import { prisma } from "../db/prisma.js";

export const createNewBid = async (req: Request, res: Response) => {
  try {
    const user = req.authUser;

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found in middleware", data: null });
    }

    const { price, auctionId } = req.body;

    if (!price || !auctionId) {
      return res
        .status(404)
        .json({ message: "price or auctionId not found", data: null });
    }

    const newBid = await prisma.bid.create({
      data: {
        price: price,
        bidderId: user.id,
        auctionId: auctionId,
      },
      include: {
        bidder: true,
        auction: true,
      },
    });

    return res.status(201).json({ message: "new bid created", data: newBid });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Error in new bid creation", data: null });
  }
};
