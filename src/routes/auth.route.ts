import { Router } from "express";
import {
  getCurrentUser,
  loginUser,
  signupUser,
} from "../controllers/auth.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = Router();

router.route("/login").post(loginUser);

router.route("/signup").post(signupUser);

router.route("/get-user").get(authMiddleware, getCurrentUser);

export default router;
