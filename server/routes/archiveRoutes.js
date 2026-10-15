/** Archive page data: archived records of one type (admin only). */
import { Router } from "express";
import { getArchived } from "../controllers/archiveController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();

router.get("/:type", protect, authorize("admin"), getArchived);

export default router;
