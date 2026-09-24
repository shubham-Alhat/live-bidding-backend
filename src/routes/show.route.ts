import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";
import { createNewShow, getAllShows } from "../controllers/show.controller.js";

const router = Router();

router.route("/get-all").get(authMiddleware, getAllShows);

router
  .route("/create")
  .post(authMiddleware, upload.single("image"), createNewShow);

export default router;
