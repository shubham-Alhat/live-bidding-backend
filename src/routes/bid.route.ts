import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { createNewBid } from "../controllers/bid.controller.js";

const router = Router();

router.route("/create").post(authMiddleware, createNewBid);

export default router;
