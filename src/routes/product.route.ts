import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";
import {
  createNewProduct,
  deleteProduct,
  getAllProducts,
  launchProduct,
} from "../controllers/product.controller.js";

const router = Router();

router
  .route("/create")
  .post(authMiddleware, upload.single("image"), createNewProduct);

router.route("/launch/:productId").put(authMiddleware, launchProduct);
router.route("/:productId").delete(authMiddleware, deleteProduct);
router.route("/get-all").get(authMiddleware, getAllProducts);

export default router;
