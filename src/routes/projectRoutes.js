import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import {
  createProject,
  deleteProject,
  getProjectById,
  getProjects,
  getTesterProjectsForBug,
  updateProject,
  updateProjectStatus,
} from "../controller/projectController.js";

const router = express.Router();

router.get("/projectList", verifyToken, getProjects);
router.get("/testerProjectList", verifyToken, getTesterProjectsForBug);
router.get("/getProjectById/:projectId", verifyToken, getProjectById);
router.post("/create", verifyToken, createProject);
router.patch("/update/:projectId", verifyToken, updateProject);
router.patch("/update/status/:projectId", verifyToken, updateProjectStatus);

router.delete("/deleteProjectById/:projectId", verifyToken, deleteProject);

export default router;
