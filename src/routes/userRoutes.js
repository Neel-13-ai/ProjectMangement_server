import express from "express";
import { verifyAdmin, verifyToken } from "../middleware/authMiddleware.js";
import {
  getUserById,
  getUsers,
  toggleUserStatus,
  updateUser,
} from "../controller/userController.js";

const router = express.Router();

router.get("/getUser", verifyToken, verifyAdmin, getUsers);
router.get("/getUserById/:id", verifyToken, verifyAdmin, getUserById);
router.patch("/update/:id", verifyToken, verifyAdmin, updateUser);
router.patch("/status/:id", verifyToken, verifyAdmin, toggleUserStatus);



export default router;
