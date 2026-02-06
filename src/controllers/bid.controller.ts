import type { Request, Response } from "express";

export const createNewBid = (req: Request, res: Response) => {
  try {
    const user = req.authUser;
    const { price, auctionId } = req.body;

    if (!price || !auctionId) {
      return res
        .status(404)
        .json({ message: "price or auctionId not found", data: null });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Error in new bid creation", data: null });
  }
};
