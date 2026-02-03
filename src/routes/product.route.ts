import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";
import { createNewProduct } from "../controllers/product.controller.js";

const router = Router();

router
  .route("/create")
  .post(authMiddleware, upload.single("image"), createNewProduct);

export default router;
