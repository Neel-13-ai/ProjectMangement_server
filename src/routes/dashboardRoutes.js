import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { adminDashboard } from "../controller/dashboardController.js";

const router = express.Router();

router.get("/admin", verifyToken, adminDashboard);

export default router;
