import { db } from "../db/db.js";
import { projects, users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

const devUser = alias(users, "devUser");
const creatorUser = alias(users, "creatorUser");

export const createProject = async (req, res) => {
  try {
    const { name, description, assignedTo } = req.body;

    if (!["ADMIN", "TESTER"].includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Only admin or tester can create a project" });
    }

    if (!assignedTo) {
      return res
        .status(400)
        .json({ message: "assignedTo (developerId) is required" });
    }

    const dev = await db.select().from(users).where(eq(users.id, assignedTo));

    if (dev.length === 0 || dev[0].role !== "DEVELOPER") {
      return res
        .status(400)
        .json({ message: "assignedTo must be a valid developer" });
    }

    const result = await db
      .insert(projects)
      .values({
        name,
        description,
        createdBy: req.user.id,
        assignedTo: assignedTo,
      })
      .returning();

    res.status(201).json({
      message: "Project created successfully",
      project: result[0],
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProject = async (req, res) => {
  try {
    const id = Number(req.params.projectId);

    const { name, description, assignedTo } = req.body;

    const project = await db.select().from(projects).where(eq(projects.id, id));

    if (project.length === 0) {
      return res.status(404).json({ message: "Project not found" });
    }

    const existing = project[0];

    if (req.user.role === "TESTER" && existing.createdBy !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Testers can update only their own projects" });
    }

    if (req.user.role === "DEVELOPER") {
      return res
        .status(403)
        .json({ message: "Developers cannot update project details" });
    }

    let updatedAssignedTo = existing.assignedTo;

    if (assignedTo) {
      const dev = await db.select().from(users).where(eq(users.id, assignedTo));

      if (dev.length === 0 || dev[0].role !== "DEVELOPER") {
        return res
          .status(400)
          .json({ message: "assignedTo must be a valid developer" });
      }

      updatedAssignedTo = assignedTo;
    }

    const updated = await db
      .update(projects)
      .set({
        name: name || existing.name,
        description: description || existing.description,
        assignedTo: updatedAssignedTo,
        updatedAt: new Date(),
      })

      .where(eq(projects.id, id))
      .returning();

    res.json({
      message: "Project updated successfully",
      project: updated[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

export const updateProjectStatus = async (req, res) => {
  try {
    const id = Number(req.params.projectId);
    const { status } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    if (req.user.role !== "DEVELOPER") {
      return res
        .status(403)
        .json({ message: "Only developers can update project status" });
    }

    const project = await db.select().from(projects).where(eq(projects.id, id));

    if (project.length === 0) {
      return res.status(404).json({ message: "Project not found" });
    }

    const existing = project[0];

    if (existing.assignedTo !== req.user.id) {
      return res.status(403).json({
        message:
          "You cannot update the status of a project not assigned to you",
      });
    }

    const allowedStatuses = ["TODO", "DOING", "DONE"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid project status" });
    }

    // Validate transitions
    const validTransitions = {
      TODO: "DOING",
      DOING: "DONE",
      DONE: null,
    };

    if (validTransitions[existing.status] !== status) {
      return res.status(400).json({
        message: `Invalid status transition: ${existing.status} → ${status}`,
      });
    }

    const updated = await db
      .update(projects)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning();

    res.json({
      message: "Project status updated successfully",
      project: updated[0],
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const getProjectById = async (req, res) => {
  try {
    const id = Number(req.params.projectId);

    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await db.select().from(projects).where(eq(projects.id, id));

    if (project.length === 0) {
      return res.status(404).json({ message: "Project not found" });
    }

    const data = project[0];

    if (req.user.role === "TESTER" && data.createdBy !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this project" });
    }

    if (req.user.role === "DEVELOPER" && data.assignedTo !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this project" });
    }

    res.json({ project: data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const id = Number(req.params.projectId);

    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    if (req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ message: "Only admin can delete projects" });
    }

    const updated = await db
      .update(projects)
      .set({ deletedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();

    res.json({ message: "Project deleted", project: updated[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getProjects = async (req, res) => {
  try {
    let whereCondition = undefined;

    // Role-based filtering
    switch (req.user.role) {
      case "TESTER":
        whereCondition = eq(projects.createdBy, req.user.id);
        break;

      case "DEVELOPER":
        whereCondition = eq(projects.assignedTo, req.user.id);
        break;

      case "ADMIN":
      default:
        whereCondition = undefined; // admin sees all
    }

    const results = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        status: projects.status,

        assignedToId: projects.assignedTo,
        assignedToName: devUser.name,

        createdById: projects.createdBy,
        createdByName: creatorUser.name,

        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .leftJoin(devUser, eq(projects.assignedTo, devUser.id)) // developer assigned
      .leftJoin(creatorUser, eq(projects.createdBy, creatorUser.id)) // creator user
      .where(whereCondition);

    res.json({
      message: "Projects fetched successfully",
      projects: results,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getTesterProjectsForBug = async (req, res) => {
  try {
    if (req.user.role !== "TESTER") {
      return res.status(403).json({
        message: "Only testers can fetch this project list",
      });
    }

    const projectsList = await db
      .select({
        id: projects.id,
        name: projects.name,
      })
      .from(projects);

    res.json({
      message: "Project list fetched successfully",
      projects: projectsList,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};
