import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import {
  getAllLiveAuctions,
  getAuctionById,
  getAuctionByProductId,
} from "../controllers/auction.controller.js";

const router = Router();

router.route("/get-all").get(authMiddleware, getAllLiveAuctions);
router
  .route("/get-auction-by-id/:auctionId")
  .get(authMiddleware, getAuctionById);

router
  .route("/get-by-productId/:id")
  .get(authMiddleware, getAuctionByProductId);

export default router;
