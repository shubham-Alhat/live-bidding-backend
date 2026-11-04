import type { Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { initAuctionInRedis } from "../websocket/handlers/helper.js";

export const getAllLiveAuctions = async (req: Request, res: Response) => {
  try {
    const user = req.authUser;

    if (!user) {
      return res
        .status(400)
        .json({ message: "user not found in mid", data: null });
    }

    // get all live auctions except his (user) own auction
    const allAuctions = await prisma.show.findMany({
      where: {
        status: "ACTIVE",
        NOT: {
          ownerId: user.id,
        },
      },
      include: {
        owner: true,
      },
    });

    return res
      .status(200)
      .json({ message: "fetched all auctions", data: allAuctions });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Error while getting live auctions", data: null });
  }
};

export const getAuctionById = async (req: Request, res: Response) => {
  try {
    const auctionId = req.params.auctionId as string;

    if (!auctionId) {
      return res
        .status(404)
        .json({ message: "auctionId missing!!", data: null });
    }

    //   get the auction
    const existingAuction = await prisma.auction.findUnique({
      where: {
        id: auctionId,
      },
      include: {
        product: true,
        owner: true,
      },
    });

    if (!existingAuction) {
      return res.status(404).json({ message: "Auction not found", data: null });
    }

    return res
      .status(200)
      .json({ message: "Auction found", data: existingAuction });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Error in auction by id", data: null });
  }
};

export const getAuctionByProductId = async (req: Request, res: Response) => {
  try {
    const productId = req.params.id as string;

    if (!productId) {
      return res
        .status(400)
        .json({ message: "productId not found", data: null });
    }

    const existingAuction = await prisma.auction.findFirst({
      where: {
        productId: productId,
      },
      include: {
        product: true,
      },
    });

    if (!existingAuction) {
      return res.status(404).json({ message: "auction not found", data: null });
    }

    return res
      .status(200)
      .json({ message: "Auction found.", data: existingAuction });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Error in auction by productId", data: null });
  }
};

export const launchAuction = async (req: Request, res: Response) => {
  try {
    const user = req.authUser;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized", data: null });
    }

    const { auctionDuration, productId, startingPrice } = req.body as {
      auctionDuration: number;
      productId: string;
      startingPrice: number;
    };

    if (!productId || !auctionDuration || !startingPrice) {
      return res.status(400).json({
        message: "productId OR Duration OR startingPrice not found",
        data: null,
      });
    }

    // get the product

    const newAuction = await prisma.auction.create({
      data: {
        auctionDuration: auctionDuration,
        startingPrice: startingPrice,
        startTime: new Date(),
        ownerId: user.id,
        productId: productId,
        status: "ACTIVE",
      },
    });

    // init auction in redis
    await initAuctionInRedis({
      ...newAuction,
      startingPrice: Number(newAuction.startingPrice.toNumber()),
      finalBidPrice: Number(newAuction.finalBidPrice?.toNumber()),
    });

    return res
      .status(201)
      .json({ message: "Auction created successfully", data: newAuction });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Error while launching Auction", data: null });
  }
};
