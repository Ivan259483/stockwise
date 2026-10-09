import { Router } from "express";
import { getMovements, stockIn, stockOut } from "../controllers/stockController.js";
import { protect } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import { stockInRules, stockOutRules } from "../validators/stockValidators.js";

const router = Router();

// Both admins and staff record stock movements.
router.use(protect);

router.post("/in", validate(stockInRules), stockIn);
router.post("/out", validate(stockOutRules), stockOut);
router.get("/movements", getMovements);

export default router;
