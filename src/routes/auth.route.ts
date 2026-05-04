import { Router } from "express";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  signupUser,
} from "../controllers/auth.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import passport from "passport";
import { handleOAuthCallback } from "../lib/handleOAuthCallback.js";

const router = Router();

router.route("/login").post(loginUser);

router.route("/signup").post(signupUser);

router.route("/get-user").get(authMiddleware, getCurrentUser);

router.route("/logout").post(authMiddleware, logoutUser);

router.route("/refresh").post(refreshAccessToken);

router.get("/google/login", (req, res, next) => {
  passport.authenticate("google", {
    session: false,
    scope: ["profile", "email"],
    prompt: "select_account", // remove in production
  })(req, res, next);
});

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed`,
  }),
  handleOAuthCallback,
);

export default router;
