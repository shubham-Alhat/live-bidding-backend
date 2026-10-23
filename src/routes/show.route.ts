import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";
import {
  createNewShow,
  deleteShowById,
  getAllShowsOfSeller,
  getShowById,
  getShowMetaData,
} from "../controllers/show.controller.js";

const router = Router();

router.route("/get-all").get(authMiddleware, getAllShowsOfSeller);

router.route("/:showId").delete(authMiddleware, deleteShowById);

router
  .route("/create")
  .post(authMiddleware, upload.single("image"), createNewShow);

router.route("/:id").get(authMiddleware, getShowById);

// public endpoint
router.route("/public/:id").get(getShowMetaData);

export default router;
