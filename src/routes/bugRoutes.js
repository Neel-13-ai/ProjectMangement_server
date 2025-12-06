import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import {
  createBug,
  getBugById,
  getBugs,
  softDeleteBug,
  updateBugDetails,
  updateBugStatus,
} from "../controller/bugController.js";

const router = express.Router();

router.post("/create", verifyToken, createBug);
router.patch("/update/:bugId", verifyToken, updateBugDetails);
router.patch("/updateBugStatus/:bugId", verifyToken, updateBugStatus);
router.get('/getBugList',verifyToken,getBugs)
router.get('/getBugById/:bugId',verifyToken,getBugById)
router.delete('/delete/:bugId',verifyToken,softDeleteBug)

export default router;
