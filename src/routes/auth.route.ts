import { Router } from "express";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  signupUser,
} from "../controllers/auth.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = Router();

router.route("/login").post(loginUser);

router.route("/signup").post(signupUser);

router.route("/get-user").get(authMiddleware, getCurrentUser);

router.route("/logout").post(authMiddleware, logoutUser);

export default router;
