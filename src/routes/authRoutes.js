import express from "express";
import { addUser, getDevelopers, login } from "../controller/authController.js";
import { verifyAdmin, verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", verifyToken, verifyAdmin, addUser);
router.post("/login", login);

router.get("/getDevelopers", verifyToken, getDevelopers);

export default router;
