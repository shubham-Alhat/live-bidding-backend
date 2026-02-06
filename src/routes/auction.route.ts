import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import {
  getAllLiveAuctions,
  getAuctionById,
} from "../controllers/auction.controller.js";

const router = Router();

router.route("/get-all").get(authMiddleware, getAllLiveAuctions);
router
  .route("/get-auction-by-id/:auctionId")
  .get(authMiddleware, getAuctionById);

export default router;
